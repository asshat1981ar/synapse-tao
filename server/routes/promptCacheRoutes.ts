import { Router } from 'express';
import { promptCacheService } from '../services/promptCacheService';
import { storage } from '../storage';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { cacheMiddleware } from '../middleware/requestCache';
import { logger } from '../utils/logger';

const router = Router();

// Get cache statistics
router.get('/stats', cacheMiddleware({ ttl: 30000 }), asyncHandler(async (req, res) => {
  const stats = await promptCacheService.getCacheStats();
  const patterns = await promptCacheService.analyzeCachePatterns();
  
  res.json({
    ...stats,
    patterns,
    timestamp: new Date().toISOString()
  });
}));

// Search cached prompts
router.get('/search', asyncHandler(async (req, res) => {
  const { provider, model, limit = 50 } = req.query;
  
  // This would need custom query implementation in storage
  // For now, return placeholder structure
  res.json({
    results: [],
    total: 0,
    filters: {
      provider: provider as string,
      model: model as string
    },
    limit: parseInt(limit as string)
  });
}));

// Get cache entry details
router.get('/entry/:hash', asyncHandler(async (req, res) => {
  const { hash } = req.params;
  const entry = await storage.getCachedPrompt(hash);
  
  if (!entry) {
    throw createError('Cache entry not found', 404, 'NOT_FOUND', 'PromptCache');
  }
  
  res.json(entry);
}));

// Manually cache a prompt response
router.post('/cache', asyncHandler(async (req, res) => {
  const { prompt, provider, model, response, responseTokens, promptTokens, responseTime, metadata } = req.body;
  
  if (!prompt || !provider || !model || !response) {
    throw createError('Missing required fields', 400, 'VALIDATION_ERROR', 'PromptCache');
  }
  
  const qualityScore = await promptCacheService.evaluateResponseQuality(prompt, response);
  
  await promptCacheService.cacheResponse(
    { prompt, provider, model, metadata },
    { response, responseTokens: responseTokens || 0, promptTokens: promptTokens || 0, responseTime: responseTime || 0, qualityScore }
  );
  
  res.json({ success: true, qualityScore });
}));

// Cleanup expired cache entries
router.post('/cleanup', asyncHandler(async (req, res) => {
  const deletedCount = await promptCacheService.cleanupExpiredEntries();
  res.json({ deletedCount, timestamp: new Date().toISOString() });
}));

// Analyze cache performance
router.get('/analysis', cacheMiddleware({ ttl: 60000 }), asyncHandler(async (req, res) => {
  const patterns = await promptCacheService.analyzeCachePatterns();
  const stats = await promptCacheService.getCacheStats();
  
  const analysis = {
    summary: {
      totalEntries: stats.totalEntries,
      hitRate: stats.hitRate,
      avgResponseTime: stats.avgResponseTime,
      efficiency: stats.hitRate > 0.3 ? 'good' : stats.hitRate > 0.1 ? 'fair' : 'poor'
    },
    patterns,
    recommendations: [
      {
        type: 'cache_optimization',
        priority: 'medium',
        description: stats.hitRate < 0.2 ? 'Consider increasing cache TTL for better hit rates' : 'Cache performance is acceptable',
        impact: 'performance'
      },
      {
        type: 'provider_optimization',
        priority: 'low',
        description: `Top provider ${patterns.topProviders[0]?.provider || 'unknown'} represents ${patterns.topProviders[0]?.usage || 0}% of usage`,
        impact: 'cost'
      }
    ]
  };
  
  res.json(analysis);
}));

export default router;