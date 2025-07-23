/**
 * DeepSeek API Client Implementation
 * Provides integration with DeepSeek AI models including DeepSeek-V3, DeepSeek-Coder, etc.
 */

import { performance } from 'perf_hooks';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DeepSeekCompletionRequest {
  model: string;
  messages: DeepSeekMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export class DeepSeekClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  // Available DeepSeek models
  public static readonly MODELS = {
    DEEPSEEK_CHAT: 'deepseek-chat',
    DEEPSEEK_CODER: 'deepseek-coder', 
    DEEPSEEK_V3: 'deepseek-v3',
    DEEPSEEK_REASONER: 'deepseek-reasoner'
  } as const;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
    this.defaultModel = DeepSeekClient.MODELS.DEEPSEEK_CHAT;

    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }
  }

  /**
   * Send a prompt to DeepSeek API
   */
  async sendPrompt(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{
    content: string;
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    responseTime: number;
  }> {
    const startTime = performance.now();
    
    console.log(`[DeepSeek] Sending request to model: ${options.model || this.defaultModel}`);
    console.log(`[DeepSeek] Prompt length: ${prompt.length} characters`);

    try {
      const messages: DeepSeekMessage[] = [];
      
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const requestBody: DeepSeekCompletionRequest = {
        model: options.model || this.defaultModel,
        messages,
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature || 0.7,
        stream: false
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DeepSeek] API error (${response.status}): ${errorText}`);
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const result: DeepSeekResponse = await response.json();
      const responseTime = performance.now() - startTime;

      console.log(`[DeepSeek] Response received in ${responseTime.toFixed(2)}ms`);
      console.log(`[DeepSeek] Token usage: ${result.usage.total_tokens} total (${result.usage.prompt_tokens} prompt + ${result.usage.completion_tokens} completion)`);

      return {
        content: result.choices[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        responseTime
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      console.error(`[DeepSeek] Error calling ${options.model || this.defaultModel}:`, error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.values(DeepSeekClient.MODELS);
  }

  /**
   * Test connection to DeepSeek API
   */
  async testConnection(): Promise<{
    connected: boolean;
    model: string;
    responseTime?: number;
    error?: string;
  }> {
    try {
      console.log('[DeepSeek] Testing connection...');
      
      const result = await this.sendPrompt(
        'Hello! Please respond with just "Hello from DeepSeek" to confirm the connection.',
        {
          model: this.defaultModel,
          maxTokens: 20,
          temperature: 0.1
        }
      );

      console.log('[DeepSeek] Connection test successful');
      
      return {
        connected: true,
        model: result.model,
        responseTime: result.responseTime
      };

    } catch (error) {
      console.error('[DeepSeek] Connection test failed:', error);
      
      return {
        connected: false,
        model: this.defaultModel,
        error: (error as Error).message
      };
    }
  }

  /**
   * Generate code using DeepSeek Coder
   */
  async generateCode(
    prompt: string,
    language: string = 'javascript',
    maxTokens: number = 500
  ): Promise<{
    code: string;
    explanation: string;
    model: string;
    usage: any;
  }> {
    const systemPrompt = `You are an expert ${language} developer. Generate clean, well-commented code based on the user's requirements. Always provide a brief explanation of what the code does.`;
    
    const result = await this.sendPrompt(prompt, {
      model: DeepSeekClient.MODELS.DEEPSEEK_CODER,
      maxTokens,
      temperature: 0.2,
      systemPrompt
    });

    // Try to split code and explanation
    const content = result.content;
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : content;
    const explanation = codeMatch ? content.replace(codeMatch[0], '').trim() : 'Code generated successfully';

    return {
      code,
      explanation,
      model: result.model,
      usage: result.usage
    };
  }

  /**
   * Analyze and reason with DeepSeek Reasoner
   */
  async analyzeAndReason(
    problem: string,
    context?: string,
    maxTokens: number = 800
  ): Promise<{
    analysis: string;
    reasoning: string;
    conclusion: string;
    model: string;
    usage: any;
  }> {
    const systemPrompt = `You are DeepSeek Reasoner, an advanced AI that excels at step-by-step reasoning and analysis. Break down complex problems into clear, logical steps. Provide your reasoning process transparently.`;
    
    const fullPrompt = context 
      ? `Context: ${context}\n\nProblem to analyze: ${problem}`
      : problem;

    const result = await this.sendPrompt(fullPrompt, {
      model: DeepSeekClient.MODELS.DEEPSEEK_REASONER,
      maxTokens,
      temperature: 0.3,
      systemPrompt
    });

    // Try to parse structured response
    const content = result.content;
    const sections = content.split(/(?:Analysis|Reasoning|Conclusion):/i);
    
    return {
      analysis: sections[1]?.trim() || content.substring(0, content.length / 3),
      reasoning: sections[2]?.trim() || content.substring(content.length / 3, 2 * content.length / 3),
      conclusion: sections[3]?.trim() || content.substring(2 * content.length / 3),
      model: result.model,
      usage: result.usage
    };
  }
}

export default DeepSeekClient;