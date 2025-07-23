/**
 * BlackboxAI Client - Dedicated client for BlackboxAI's free models
 * Supports all free models including deepseek, llama, gemma, mistral, and qwen
 */

interface BlackboxRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface BlackboxResponse {
  choices: Array<{
    message?: { content: string };
    text?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class BlackboxClient {
  private apiKey: string;
  private baseUrl: string;

  // Free models available on BlackboxAI
  public static readonly FREE_MODELS = [
    'blackboxai/deepseek/deepseek-v3-base:free',
    'blackboxai/llama-3.1-8b:free',
    'blackboxai/llama-3.1-70b:free', 
    'blackboxai/gemma-7b:free',
    'blackboxai/mistral-7b:free',
    'blackboxai/qwen-2.5-coder-32b:free'
  ];

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.blackbox.ai/chat/completions';
  }

  /**
   * Send a prompt to BlackboxAI using specified model
   * @param prompt The text prompt to send
   * @param model The model to use (defaults to deepseek-v3-base:free)
   * @param options Additional options for the request
   */
  async sendPrompt(
    prompt: string, 
    model: string = 'blackboxai/deepseek/deepseek-v3-base:free',
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    content: string;
    model: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    try {
      const requestBody: BlackboxRequest = {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        stream: false
      };

      console.log(`[BlackboxAI] Sending request to model: ${model}`);
      console.log(`[BlackboxAI] Prompt length: ${prompt.length} characters`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BlackboxAI API error (${response.status}): ${errorText}`);
      }

      const data: BlackboxResponse = await response.json();
      
      // Log token usage if available
      if (data.usage) {
        console.log(`[BlackboxAI] Token usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`);
      }

      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
      
      if (!content) {
        throw new Error('No content received from BlackboxAI API');
      }

      return {
        content,
        model,
        usage: data.usage
      };
    } catch (error) {
      console.error(`[BlackboxAI] Error calling ${model}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available free models
   */
  getAvailableModels(): string[] {
    return BlackboxClient.FREE_MODELS;
  }

  /**
   * Test connection to BlackboxAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.sendPrompt(
        'Hello, can you respond with just "OK" to test the connection?',
        'blackboxai/deepseek/deepseek-v3-base:free',
        { maxTokens: 10 }
      );
      
      console.log('[BlackboxAI] Connection test successful');
      return result.content.trim().length > 0;
    } catch (error) {
      console.error('[BlackboxAI] Connection test failed:', error);
      return false;
    }
  }
}

// Example usage function
export async function exampleUsage() {
  if (!process.env.BLACKBOX_API_KEY) {
    console.log('BLACKBOX_API_KEY not found in environment variables');
    return;
  }

  const client = new BlackboxClient(process.env.BLACKBOX_API_KEY, process.env.BLACKBOX_API_URL);
  
  try {
    console.log('\n=== BlackboxAI Integration Test ===');
    
    // Test connection
    console.log('\n1. Testing connection...');
    const isConnected = await client.testConnection();
    console.log(`Connection status: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
    
    if (!isConnected) return;

    // Test with different models
    const testPrompt = "What's the capital of France?";
    
    for (const model of client.getAvailableModels().slice(0, 3)) { // Test first 3 models
      console.log(`\n2. Testing model: ${model}`);
      try {
        const result = await client.sendPrompt(testPrompt, model, { maxTokens: 50 });
        console.log(`Response: ${result.content.substring(0, 100)}...`);
        console.log(`Tokens used: ${result.usage?.total_tokens || 'N/A'}`);
      } catch (error) {
        console.log(`Failed to test ${model}: ${(error as Error).message}`);
      }
    }
    
    console.log('\n=== BlackboxAI Test Complete ===\n');
  } catch (error) {
    console.error('BlackboxAI integration test failed:', error);
  }
}