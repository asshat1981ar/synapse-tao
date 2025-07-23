import { logger } from './logger.js';

interface ServiceConfig {
  singleton?: boolean;
  dependencies?: string[];
  initialize?: () => Promise<void>;
}

interface RegisteredService {
  name: string;
  instance: any;
  config: ServiceConfig;
  initialized: boolean;
}

/**
 * Service Registry for dependency injection and management
 */
export class ServiceRegistry {
  private static services: Map<string, RegisteredService> = new Map();
  private static initializing: Set<string> = new Set();

  /**
   * Register a service
   */
  static register<T>(
    name: string,
    ServiceClass: new (...args: any[]) => T,
    config: ServiceConfig = {}
  ): void {
    if (this.services.has(name)) {
      logger.warn(`Service already registered: ${name}`, {
        service: 'ServiceRegistry'
      });
      return;
    }

    const instance = config.singleton ? new ServiceClass() : ServiceClass;

    this.services.set(name, {
      name,
      instance,
      config,
      initialized: false
    });

    logger.info(`Service registered: ${name}`, {
      service: 'ServiceRegistry',
      singleton: config.singleton,
      dependencies: config.dependencies
    });
  }

  /**
   * Get a service instance
   */
  static async get<T>(name: string): Promise<T> {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    // Initialize if needed
    if (service.config.singleton && !service.initialized) {
      await this.initialize(name);
    }

    // Return instance or class
    return service.config.singleton ? service.instance : new service.instance();
  }

  /**
   * Initialize a service and its dependencies
   */
  private static async initialize(name: string): Promise<void> {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    if (service.initialized) {
      return;
    }

    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    this.initializing.add(name);

    try {
      // Initialize dependencies first
      if (service.config.dependencies) {
        for (const dep of service.config.dependencies) {
          await this.initialize(dep);
        }
      }

      // Run custom initialization
      if (service.config.initialize) {
        await service.config.initialize();
      }

      service.initialized = true;
      
      logger.debug(`Service initialized: ${name}`, {
        service: 'ServiceRegistry'
      });
    } finally {
      this.initializing.delete(name);
    }
  }

  /**
   * Initialize all registered services
   */
  static async initializeAll(): Promise<void> {
    const services = Array.from(this.services.keys());
    
    for (const name of services) {
      await this.initialize(name);
    }
    
    logger.info('All services initialized', {
      service: 'ServiceRegistry',
      count: services.length
    });
  }

  /**
   * Get service status
   */
  static getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.services.forEach((service, name) => {
      status[name] = {
        initialized: service.initialized,
        singleton: service.config.singleton,
        dependencies: service.config.dependencies || []
      };
    });
    
    return status;
  }

  /**
   * Clear all services (for testing)
   */
  static clear(): void {
    this.services.clear();
    this.initializing.clear();
  }
}