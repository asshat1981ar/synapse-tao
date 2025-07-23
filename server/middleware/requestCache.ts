import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache for request responses
 * In production, this should be replaced with Redis
 */
class RequestCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 300000; // 5 minutes

  /**
   * Generate cache key from request
   */
  generateKey(req: Request): string {
    const parts = [
      req.method,
      req.path,
      JSON.stringify(req.query),
      JSON.stringify(req.body)
    ];
    
    return crypto
      .createHash('sha256')
      .update(parts.join(':'))
      .digest('hex');
  }

  /**
   * Get cached response
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set cached response
   */
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cache = new RequestCache();

// Clear expired entries every minute
setInterval(() => cache.clearExpired(), 60000);

/**
 * Cache middleware factory
 */
export function cacheMiddleware(options: {
  ttl?: number;
  methods?: string[];
  paths?: RegExp[];
} = {}) {
  const { 
    ttl = 300000, 
    methods = ['GET'],
    paths = []
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache specified methods
    if (!methods.includes(req.method)) {
      return next();
    }

    // Check if path matches cache patterns
    if (paths.length > 0 && !paths.some(pattern => pattern.test(req.path))) {
      return next();
    }

    const key = cache.generateKey(req);
    const cached = cache.get(key);

    if (cached) {
      logger.debug('Cache hit', {
        service: 'RequestCache',
        path: req.path,
        method: req.method
      });
      
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data: any) {
      cache.set(key, data, ttl);
      
      logger.debug('Cache set', {
        service: 'RequestCache',
        path: req.path,
        method: req.method,
        ttl
      });
      
      return originalJson.call(this, data);
    };

    next();
  };
}

export { cache as requestCache };