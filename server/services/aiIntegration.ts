import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { BlackboxClient } from './blackboxClient';
import DeepSeekClient from './deepseekClient';
import OpenAIClient from './openaiClient';
import { CircuitBreaker, CircuitState } from './circuitBreaker';
import { CircuitBreakerFactory } from '../utils/circuitBreakerFactory.js';
import { logger } from '../utils/logger.js';
import { storage } from '../storage';
import { promptCacheService, type CacheableRequest, type CacheableResponse } from './promptCacheService';
import { learningOptimizer } from './learningOptimizer';

interface AIProvider {
  name: string;
  client: any;
  circuitBreaker: CircuitBreaker;
  models: string[];
}

interface AIRequest {
  prompt: string;
  model?: string;
  provider?: string;
  maxTokens?: number;
}

interface AIResponse {
  content: string;
  provider: string;
  model: string;
  responseTime: number;
}

export class AIIntegrationService {
  private providers: Map<string, AIProvider> = new Map();
  private fallbackChain: string[] = ['openai', 'anthropic', 'deepseek', 'google'];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    logger.info('Initializing AI providers', { service: 'AIIntegration' });
    
    // OpenAI (Standard SDK)
    if (process.env.OPENAI_API_KEY) {
      logger.info('Initializing OpenAI providers', { service: 'AIIntegration' });
      this.providers.set('openai-standard', {
        name: 'OpenAI Standard',
        client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
        circuitBreaker: CircuitBreakerFactory.create('openai-standard'),
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
      });

      // OpenAI (Enhanced Client)
      this.providers.set('openai', {
        name: 'OpenAI Enhanced',
        client: new OpenAIClient(),
        circuitBreaker: CircuitBreakerFactory.create('openai-enhanced'),
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'dall-e-3', 'whisper-1']
      });
    } else {
      logger.warn('OPENAI_API_KEY not found', { service: 'AIIntegration' });
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      logger.info('Initializing Anthropic provider', { service: 'AIIntegration' });
      this.providers.set('anthropic', {
        name: 'Anthropic',
        client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
        circuitBreaker: CircuitBreakerFactory.create('anthropic'),
        models: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022']
      });
    } else {
      logger.warn('ANTHROPIC_API_KEY not found', { service: 'AIIntegration' });
    }

    // Google AI
    if (process.env.GEMINI_API_KEY) {
      this.providers.set('google', {
        name: 'Google AI',
        client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
        circuitBreaker: new CircuitBreaker({
          failureThreshold: 3,
          resetTimeout: 60000,
          healthCheckInterval: 30000
        }),
        models: ['gemini-2.5-flash', 'gemini-2.5-pro']
      });
    }

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      logger.info('Initializing DeepSeek provider', { service: 'AIIntegration' });
      this.providers.set('deepseek', {
        name: 'DeepSeek',
        client: new DeepSeekClient(),
        circuitBreaker: CircuitBreakerFactory.create('deepseek'),
        models: ['deepseek-chat', 'deepseek-coder', 'deepseek-v3', 'deepseek-reasoner']
      });
    } else {
      logger.warn('DEEPSEEK_API_KEY not found', { service: 'AIIntegration' });
    }

    // BlackboxAI (temporarily disabled due to API key format issue)
    // if (process.env.BLACKBOX_API_KEY && process.env.BLACKBOX_API_KEY.startsWith('sk-')) {
    //   this.providers.set('blackboxai', {
    //     name: 'BlackboxAI',
    //     client: new BlackboxClient(process.env.BLACKBOX_API_KEY || ''),
    //     circuitBreaker: new CircuitBreaker({
    //       failureThreshold: 3,
    //       resetTimeout: 60000,
    //       healthCheckInterval: 30000
    //     }),
    //     models: [
    //       'blackboxai/deepseek/deepseek-v3-base:free',
    //       'blackboxai/llama-3.1-8b:free',
    //       'blackboxai/llama-3.1-70b:free',
    //       'blackboxai/gemma-7b:free',
    //       'blackboxai/mistral-7b:free',
    //       'blackboxai/qwen-2.5-coder-32b:free'
    //     ]
    //   });
    // }
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    console.log(`[AIIntegration] Processing request with provider: ${request.provider}, available providers: ${Array.from(this.providers.keys()).join(', ')}`);

    // Try specific provider if requested
    if (request.provider && this.providers.has(request.provider)) {
      try {
        console.log(`[AIIntegration] Using specific provider: ${request.provider}`);
        const result = await this.callProvider(request.provider, request);
        return {
          ...result,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;
        console.log(`[AIIntegration] Provider ${request.provider} failed: ${(error as Error).message}`);
        await this.logError('ai-integration', `Provider ${request.provider} failed: ${(error as Error).message}`);
      }
    }

    // Try fallback chain
    console.log(`[AIIntegration] Trying fallback chain: ${this.fallbackChain.join(' -> ')}`);
    for (const providerName of this.fallbackChain) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        console.log(`[AIIntegration] Provider ${providerName} not available`);
        continue;
      }

      try {
        if (provider.circuitBreaker.getState() === CircuitState.OPEN) {
          console.log(`[AIIntegration] Provider ${providerName} circuit breaker is OPEN`);
          continue;
        }

        console.log(`[AIIntegration] Trying fallback provider: ${providerName}`);
        const result = await this.callProvider(providerName, request);
        return {
          ...result,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;
        console.log(`[AIIntegration] Fallback provider ${providerName} failed: ${(error as Error).message}`);
        await this.logError('ai-integration', `Fallback provider ${providerName} failed: ${(error as Error).message}`);
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  private async callProvider(providerName: string, request: AIRequest): Promise<Omit<AIResponse, 'responseTime'>> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    return await provider.circuitBreaker.call(async () => {
      switch (providerName) {
        case 'openai':
          return await this.callOpenAI(provider, request);
        case 'anthropic':
          return await this.callAnthropic(provider, request);
        case 'google':
          return await this.callGoogle(provider, request);
        case 'deepseek':
          return await this.callDeepSeek(provider, request);
        default:
          throw new Error(`Unsupported provider: ${providerName}`);
      }
    });
  }

  private async callOpenAI(provider: AIProvider, request: AIRequest): Promise<Omit<AIResponse, 'responseTime'>> {
    // Use OpenAI-specific model if not specified
    const model = request.model && provider.models.includes(request.model) 
      ? request.model 
      : 'gpt-4o'; // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    
    // Check if it's the enhanced client (has sendPrompt method) or standard SDK
    if (typeof provider.client.sendPrompt === 'function') {
      // Enhanced OpenAI client
      const response = await provider.client.sendPrompt(request.prompt, {
        model,
        maxTokens: request.maxTokens || 1000
      });
      
      return {
        content: response.content || '',
        provider: 'openai',
        model: response.model || model
      };
    } else if (provider.client.chat && typeof provider.client.chat.completions?.create === 'function') {
      // Standard OpenAI SDK
      const response = await provider.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens || 1000
      });

      return {
        content: response.choices[0].message.content || '',
        provider: 'openai',
        model
      };
    } else {
      throw new Error('OpenAI client interface not recognized');
    }
  }

  private async callAnthropic(provider: AIProvider, request: AIRequest): Promise<Omit<AIResponse, 'responseTime'>> {
    const model = request.model || 'claude-sonnet-4-20250514'; // The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229"
    
    const response = await provider.client.messages.create({
      model,
      max_tokens: request.maxTokens || 1000,
      messages: [{ role: 'user', content: request.prompt }]
    });

    return {
      content: response.content[0].text || '',
      provider: 'anthropic',
      model
    };
  }

  private async callGoogle(provider: AIProvider, request: AIRequest): Promise<Omit<AIResponse, 'responseTime'>> {
    const model = request.model || 'gemini-2.5-flash'; // Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
    
    const response = await provider.client.models.generateContent({
      model,
      contents: request.prompt
    });

    return {
      content: response.text || '',
      provider: 'google',
      model
    };
  }

  private async callBlackboxAI(provider: AIProvider, request: AIRequest): Promise<Omit<AIResponse, 'responseTime'>> {
    const model = request.model || 'blackboxai/deepseek/deepseek-v3-base:free';
    
    try {
      const response = await fetch(process.env.BLACKBOX_API_URL || 'https://api.blackbox.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.client.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens || 1000,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BlackboxAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Log token usage if available
      if (data.usage) {
        await this.logTokenUsage('blackboxai', model, data.usage);
      }

      return {
        content: data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '',
        provider: 'blackboxai',
        model
      };
    } catch (error) {
      await this.logError('blackboxai', `BlackboxAI call failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async callDeepSeek(provider: AIProvider, request: AIRequest): Promise<Omit<AIResponse, 'responseTime'>> {
    // Use DeepSeek-specific model if not specified
    const model = request.model && provider.models.includes(request.model) 
      ? request.model 
      : 'deepseek-chat';
    
    try {
      const response = await provider.client.sendPrompt(request.prompt, {
        model,
        maxTokens: request.maxTokens || 1000,
        temperature: 0.7
      });

      return {
        content: response.content || '',
        provider: 'deepseek',
        model: response.model
      };
    } catch (error) {
      await this.logError('deepseek', `DeepSeek call failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async logError(service: string, message: string): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'error',
        service,
        message,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  private async logTokenUsage(provider: string, model: string, usage: any): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'info',
        service: 'ai-integration',
        message: `Token usage for ${provider}/${model}`,
        metadata: {
          timestamp: new Date().toISOString(),
          provider,
          model,
          usage: {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0
          }
        }
      });
    } catch (error) {
      console.error('Failed to log token usage:', error);
    }
  }

  getProviderStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, provider] of Array.from(this.providers)) {
      status[name] = {
        name: provider.name,
        state: provider.circuitBreaker.getState(),
        failureCount: provider.circuitBreaker.getFailureCount(),
        models: provider.models
      };
    }
    
    return status;
  }
}

export const aiIntegrationService = new AIIntegrationService();
