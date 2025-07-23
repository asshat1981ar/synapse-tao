/**
 * OpenAI API Client Implementation
 * Provides integration with OpenAI models including GPT-4o, GPT-4o-mini, DALL-E 3, Whisper
 */

import { performance } from 'perf_hooks';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

interface OpenAIResponse {
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

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export class OpenAIClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  // Available OpenAI models
  public static readonly MODELS = {
    GPT_4O: 'gpt-4o',
    GPT_4O_MINI: 'gpt-4o-mini',
    GPT_4_TURBO: 'gpt-4-turbo',
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    DALL_E_3: 'dall-e-3',
    DALL_E_2: 'dall-e-2',
    WHISPER_1: 'whisper-1',
    TTS_1: 'tts-1',
    TTS_1_HD: 'tts-1-hd'
  } as const;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.defaultModel = OpenAIClient.MODELS.GPT_4O;

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
  }

  /**
   * Send a prompt to OpenAI API
   */
  async sendPrompt(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
      responseFormat?: 'json' | 'text';
      images?: string[]; // Base64 encoded images
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
    
    console.log(`[OpenAI] Sending request to model: ${options.model || this.defaultModel}`);
    console.log(`[OpenAI] Prompt length: ${prompt.length} characters`);

    try {
      const messages: OpenAIMessage[] = [];
      
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }
      
      // Handle images for vision models
      if (options.images && options.images.length > 0) {
        const content: Array<any> = [
          {
            type: 'text',
            text: prompt
          }
        ];
        
        options.images.forEach(image => {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
              detail: 'high'
            }
          });
        });
        
        messages.push({
          role: 'user',
          content
        });
      } else {
        messages.push({
          role: 'user',
          content: prompt
        });
      }

      const requestBody: OpenAICompletionRequest = {
        model: options.model || this.defaultModel,
        messages,
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature || 0.7
      };

      if (options.responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
      }

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
        console.error(`[OpenAI] API error (${response.status}): ${errorText}`);
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const result: OpenAIResponse = await response.json();
      const responseTime = performance.now() - startTime;

      console.log(`[OpenAI] Response received in ${responseTime.toFixed(2)}ms`);
      console.log(`[OpenAI] Token usage: ${result.usage.total_tokens} total (${result.usage.prompt_tokens} prompt + ${result.usage.completion_tokens} completion)`);

      return {
        content: result.choices[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        responseTime
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      console.error(`[OpenAI] Error calling ${options.model || this.defaultModel}:`, error);
      throw error;
    }
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(
    prompt: string,
    options: {
      model?: 'dall-e-2' | 'dall-e-3';
      size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
      style?: 'vivid' | 'natural';
      n?: number;
    } = {}
  ): Promise<{
    url: string;
    revised_prompt?: string;
    model: string;
  }> {
    console.log(`[OpenAI] Generating image with model: ${options.model || 'dall-e-3'}`);
    
    try {
      const requestBody = {
        model: options.model || 'dall-e-3',
        prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid'
      };

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenAI] Image generation error (${response.status}): ${errorText}`);
        throw new Error(`OpenAI image generation error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('[OpenAI] Image generated successfully');

      return {
        url: result.data[0].url,
        revised_prompt: result.data[0].revised_prompt,
        model: requestBody.model
      };

    } catch (error) {
      console.error('[OpenAI] Error generating image:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      model?: 'whisper-1';
      language?: string;
      prompt?: string;
      response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
      temperature?: number;
    } = {}
  ): Promise<{
    text: string;
    language?: string;
    duration?: number;
    segments?: any[];
  }> {
    console.log('[OpenAI] Transcribing audio with Whisper');
    
    try {
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
      formData.append('model', options.model || 'whisper-1');
      
      if (options.language) formData.append('language', options.language);
      if (options.prompt) formData.append('prompt', options.prompt);
      if (options.response_format) formData.append('response_format', options.response_format);
      if (options.temperature) formData.append('temperature', options.temperature.toString());

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenAI] Transcription error (${response.status}): ${errorText}`);
        throw new Error(`OpenAI transcription error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('[OpenAI] Audio transcribed successfully');

      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments
      };

    } catch (error) {
      console.error('[OpenAI] Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.values(OpenAIClient.MODELS);
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<{
    connected: boolean;
    model: string;
    responseTime?: number;
    error?: string;
  }> {
    try {
      console.log('[OpenAI] Testing connection...');
      
      const result = await this.sendPrompt(
        'Hello! Please respond with just "Hello from OpenAI" to confirm the connection.',
        {
          model: this.defaultModel,
          maxTokens: 20,
          temperature: 0.1
        }
      );

      console.log('[OpenAI] Connection test successful');
      
      return {
        connected: true,
        model: result.model,
        responseTime: result.responseTime
      };

    } catch (error) {
      console.error('[OpenAI] Connection test failed:', error);
      
      return {
        connected: false,
        model: this.defaultModel,
        error: (error as Error).message
      };
    }
  }

  /**
   * Analyze image using GPT-4 Vision
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string = 'Describe what you see in this image in detail.',
    maxTokens: number = 300
  ): Promise<{
    description: string;
    model: string;
    usage: any;
  }> {
    const result = await this.sendPrompt(prompt, {
      model: OpenAIClient.MODELS.GPT_4O,
      maxTokens,
      temperature: 0.3,
      images: [imageBase64]
    });

    return {
      description: result.content,
      model: result.model,
      usage: result.usage
    };
  }
}

export default OpenAIClient;