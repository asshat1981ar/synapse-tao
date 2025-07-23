import { storage } from '../storage';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import type { PromptCache, InsertPromptCache } from '@shared/schema';

export interface CacheableRequest {
  prompt: string;
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
}

export interface CacheableResponse {
  response: string;
  responseTokens: number;
  promptTokens: number;
  responseTime: number;
  qualityScore?: number;
}

export class PromptCacheService {
  private readonly DEFAULT_TTL_HOURS = 24;
  private readonly CACHE_KEY_PREFIX = 'prompt_cache:';

  /**
   * Normalize prompt for consistent caching
   */
  private normalizePrompt(prompt: string, provider: string, model: string, temperature?: number): string {
    // Remove extra whitespace and normalize formatting
    const normalized = prompt.trim().replace(/\s+/g, ' ');
    
    // Include key parameters that affect response
    const params = {
      provider,
      model,
      temperature: temperature || 0.7
    };
    
    return `${normalized}|${JSON.stringify(params)}`;
  }

  /**
   * Generate cache hash for prompt
   */
  private generateCacheHash(request: CacheableRequest): string {
    const normalizedPrompt = this.normalizePrompt(
      request.prompt,
      request.provider,
      request.model,
      request.temperature
    );
    
    return createHash('sha256').update(normalizedPrompt).digest('hex');
  }

  /**
   * Check if a prompt response is cached
   */
  async getCachedResponse(request: CacheableRequest): Promise<PromptCache | null> {
    try {
      const promptHash = this.generateCacheHash(request);
      const cached = await storage.getCachedPrompt(promptHash);
      
      if (cached) {
        logger.info('PromptCache', `Cache hit for prompt hash: ${promptHash.substring(0, 8)}...`);
        return cached;
      }
      
      logger.debug('PromptCache', `Cache miss for prompt hash: ${promptHash.substring(0, 8)}...`);
      return null;
    } catch (error) {
      logger.error('PromptCache', `Error retrieving cached prompt: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Cache a prompt response
   */
  async cacheResponse(request: CacheableRequest, response: CacheableResponse): Promise<void> {
    try {
      const promptHash = this.generateCacheHash(request);
      const expiresAt = new Date(Date.now() + this.DEFAULT_TTL_HOURS * 60 * 60 * 1000);
      
      const cacheEntry: InsertPromptCache = {
        id: nanoid(),
        promptHash,
        prompt: request.prompt,
        provider: request.provider,
        model: request.model,
        response: response.response,
        responseTokens: response.responseTokens,
        promptTokens: response.promptTokens,
        responseTime: response.responseTime,
        qualityScore: response.qualityScore || 0.0,
        usageCount: 1,
        lastUsed: new Date(),
        expiresAt,
        metadata: request.metadata || {}
      };

      await storage.setCachedPrompt(cacheEntry);
      logger.info('PromptCache', `Cached response for prompt hash: ${promptHash.substring(0, 8)}...`);
    } catch (error) {
      logger.error('PromptCache', `Error caching prompt response: ${(error as Error).message}`);
    }
  }

  /**
   * Evaluate response quality using AI
   */
  async evaluateResponseQuality(prompt: string, response: string): Promise<number> {
    try {
      // This would typically use an AI model to evaluate quality
      // For now, we'll use simple heuristics
      
      let score = 0.5; // Base score
      
      // Length appropriateness (not too short, not excessively long)
      const responseLength = response.length;
      if (responseLength > 50 && responseLength < 5000) {
        score += 0.2;
      }
      
      // Check for common quality indicators
      if (response.includes('```')) score += 0.1; // Code blocks
      if (response.match(/\d+\./)) score += 0.1; // Numbered lists
      if (response.includes('•') || response.includes('-')) score += 0.1; // Bullet points
      
      // Penalize common low-quality indicators
      if (response.includes('I apologize, but I')) score -= 0.2;
      if (response.includes('I cannot') || response.includes("I can't")) score -= 0.1;
      
      return Math.max(0, Math.min(1, score));
    } catch (error) {
      logger.error('PromptCache', `Error evaluating response quality: ${(error as Error).message}`);
      return 0.5; // Default neutral score
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const deletedCount = await storage.cleanupExpiredCache();
      if (deletedCount > 0) {
        logger.info('PromptCache', `Cleaned up ${deletedCount} expired cache entries`);
      }
      return deletedCount;
    } catch (error) {
      logger.error('PromptCache', `Error cleaning up expired cache: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalEntries: number; hitRate: number; avgResponseTime: number }> {
    try {
      return await storage.getCacheStats();
    } catch (error) {
      logger.error('PromptCache', `Error retrieving cache stats: ${(error as Error).message}`);
      return { totalEntries: 0, hitRate: 0, avgResponseTime: 0 };
    }
  }

  /**
   * Analyze cache patterns for optimization insights
   */
  async analyzeCachePatterns(): Promise<{
    topProviders: Array<{ provider: string; usage: number }>;
    topModels: Array<{ model: string; usage: number }>;
    averageResponseTime: number;
    qualityDistribution: { high: number; medium: number; low: number };
  }> {
    try {
      // This would query the database for analytics
      // For now, return placeholder structure
      return {
        topProviders: [
          { provider: 'deepseek', usage: 65 },
          { provider: 'openai', usage: 25 },
          { provider: 'anthropic', usage: 10 }
        ],
        topModels: [
          { model: 'deepseek-coder', usage: 40 },
          { model: 'deepseek-v3', usage: 25 },
          { model: 'gpt-4o', usage: 20 }
        ],
        averageResponseTime: 2500,
        qualityDistribution: {
          high: 70, // quality score > 0.7
          medium: 25, // quality score 0.4 - 0.7
          low: 5 // quality score < 0.4
        }
      };
    } catch (error) {
      logger.error('PromptCache', `Error analyzing cache patterns: ${(error as Error).message}`);
      return {
        topProviders: [],
        topModels: [],
        averageResponseTime: 0,
        qualityDistribution: { high: 0, medium: 0, low: 0 }
      };
    }
  }
}

// Singleton instance
export const promptCacheService = new PromptCacheService();