import { Router } from 'express';
import { learningOptimizer } from '../services/learningOptimizer';
import { storage } from '../storage';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { cacheMiddleware } from '../middleware/requestCache';
import { logger } from '../utils/logger';

const router = Router();

// Get all learning experiments
router.get('/experiments', cacheMiddleware({ ttl: 30000 }), asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  let experiments;
  if (status === 'active') {
    experiments = await storage.getActiveLearningExperiments();
  } else {
    experiments = await storage.getAllLearningExperiments();
  }
  
  res.json(experiments);
}));

// Get specific experiment
router.get('/experiments/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const experiment = await storage.getLearningExperiment(id);
  
  if (!experiment) {
    throw createError('Experiment not found', 404, 'NOT_FOUND', 'Learning');
  }
  
  const results = await storage.getLearningResultsByExperiment(id);
  const analysis = await storage.getExperimentAnalysis(id);
  
  res.json({
    experiment,
    results,
    analysis
  });
}));

// Create new experiment
router.post('/experiments', asyncHandler(async (req, res) => {
  const { name, type, hypothesis, variants, primaryMetric, secondaryMetrics, targetImprovement, sampleSize } = req.body;
  
  if (!name || !type || !hypothesis || !variants || !primaryMetric) {
    throw createError('Missing required experiment fields', 400, 'VALIDATION_ERROR', 'Learning');
  }
  
  if (!Array.isArray(variants) || variants.length < 2) {
    throw createError('At least 2 variants required for experiment', 400, 'VALIDATION_ERROR', 'Learning');
  }
  
  const experiment = await learningOptimizer.createExperiment({
    name,
    type,
    hypothesis,
    variants,
    primaryMetric,
    secondaryMetrics: secondaryMetrics || [],
    targetImprovement: targetImprovement || 0.1,
    sampleSize: sampleSize || 100
  });
  
  res.status(201).json(experiment);
}));

// Update experiment status
router.patch('/experiments/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['active', 'paused', 'completed', 'archived'].includes(status)) {
    throw createError('Invalid status', 400, 'VALIDATION_ERROR', 'Learning');
  }
  
  if (status === 'paused') {
    await learningOptimizer.pauseExperiment(id);
  } else if (status === 'active') {
    await learningOptimizer.resumeExperiment(id);
  } else {
    await storage.updateLearningExperiment(id, { status });
  }
  
  const experiment = await storage.getLearningExperiment(id);
  res.json(experiment);
}));

// Record experiment result
router.post('/experiments/:id/results', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { variantId, prompt, response, responseTime, qualityScore, userRating, success, errorType, metadata } = req.body;
  
  if (!variantId || !prompt || !response || responseTime === undefined || success === undefined) {
    throw createError('Missing required result fields', 400, 'VALIDATION_ERROR', 'Learning');
  }
  
  await learningOptimizer.recordResult({
    experimentId: id,
    variantId,
    prompt,
    response,
    responseTime,
    qualityScore,
    userRating,
    success,
    errorType,
    metadata
  });
  
  res.json({ success: true, recordedAt: new Date().toISOString() });
}));

// Get optimization insights
router.get('/insights', cacheMiddleware({ ttl: 60000 }), asyncHandler(async (req, res) => {
  const { category, status = 'new' } = req.query;
  
  let insights;
  if (status === 'actionable') {
    insights = await storage.getActionableInsights();
  } else {
    insights = await storage.getOptimizationInsights(category as string);
  }
  
  res.json(insights);
}));

// Create optimization insight
router.post('/insights', asyncHandler(async (req, res) => {
  const { type, category, insight, confidence, impact, recommendation, dataPoints, evidence } = req.body;
  
  if (!type || !category || !insight || confidence === undefined || !impact) {
    throw createError('Missing required insight fields', 400, 'VALIDATION_ERROR', 'Learning');
  }
  
  const newInsight = await storage.createOptimizationInsight({
    id: require('nanoid').nanoid(),
    type,
    category,
    insight,
    confidence,
    impact,
    recommendation,
    dataPoints: dataPoints || 0,
    evidence,
    status: 'new'
  });
  
  res.status(201).json(newInsight);
}));

// Update insight status
router.patch('/insights/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, implementedAt } = req.body;
  
  if (!status || !['new', 'reviewing', 'approved', 'implemented', 'rejected'].includes(status)) {
    throw createError('Invalid insight status', 400, 'VALIDATION_ERROR', 'Learning');
  }
  
  const updates: any = { status };
  if (status === 'implemented' && implementedAt) {
    updates.implementedAt = new Date(implementedAt);
  }
  
  const insight = await storage.updateOptimizationInsight(id, updates);
  res.json(insight);
}));

// Get learning system summary
router.get('/summary', cacheMiddleware({ ttl: 60000 }), asyncHandler(async (req, res) => {
  const summary = await learningOptimizer.getExperimentSummary();
  const cacheStats = await require('../services/promptCacheService').promptCacheService.getCacheStats();
  
  res.json({
    ...summary,
    cache: cacheStats,
    lastUpdated: new Date().toISOString()
  });
}));

// Get experiment analytics
router.get('/analytics', cacheMiddleware({ ttl: 60000 }), asyncHandler(async (req, res) => {
  const { timeRange = '7d' } = req.query;
  
  // This would implement time-based analytics
  // For now, return structured placeholder
  const analytics = {
    timeRange,
    metrics: {
      experimentsCreated: 5,
      experimentsCompleted: 2,
      insightsGenerated: 8,
      cacheHitRate: 0.35,
      avgQualityImprovement: 0.15
    },
    trends: {
      qualityScores: [0.65, 0.68, 0.72, 0.75, 0.78, 0.80, 0.82],
      responseTimes: [2800, 2650, 2500, 2400, 2350, 2300, 2250],
      experimentActivity: [1, 2, 1, 0, 2, 1, 3]
    },
    topPerformers: {
      models: [
        { name: 'deepseek-coder', qualityScore: 0.85, usage: 45 },
        { name: 'deepseek-v3', qualityScore: 0.82, usage: 30 },
        { name: 'gpt-4o', qualityScore: 0.80, usage: 25 }
      ],
      variants: [
        { id: 'optimized-prompt-v2', improvement: 0.18, experiments: 3 },
        { id: 'temperature-0.3', improvement: 0.12, experiments: 2 }
      ]
    }
  };
  
  res.json(analytics);
}));

export default router;