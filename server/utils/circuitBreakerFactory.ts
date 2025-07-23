import { CircuitBreaker, CircuitBreakerConfig } from '../services/circuitBreaker.js';
import { logger } from './logger.js';

/**
 * Factory for creating circuit breakers with consistent configuration
 */
export class CircuitBreakerFactory {
  private static defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeout: 60000,
    healthCheckInterval: 30000
  };

  private static breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create or retrieve a circuit breaker instance
   */
  static create(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    // Check if breaker already exists
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    // Create new breaker with merged config
    const finalConfig = {
      ...this.defaultConfig,
      ...config
    };

    logger.debug(`Creating circuit breaker: ${name}`, {
      service: 'CircuitBreakerFactory',
      config: finalConfig
    });

    const breaker = new CircuitBreaker(finalConfig);
    this.breakers.set(name, breaker);

    return breaker;
  }

  /**
   * Get all circuit breakers status
   */
  static getAllStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.breakers.forEach((breaker, name) => {
      status[name] = {
        state: breaker.getState(),
        failures: breaker.getFailureCount(),
        lastFailure: breaker.getLastFailureTime()
      };
    });

    return status;
  }

  /**
   * Reset a specific circuit breaker
   */
  static reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      logger.info(`Circuit breaker reset: ${name}`, {
        service: 'CircuitBreakerFactory'
      });
    }
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach((breaker, name) => {
      breaker.reset();
    });
    logger.info('All circuit breakers reset', {
      service: 'CircuitBreakerFactory'
    });
  }
}