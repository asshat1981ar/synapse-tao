import { logger } from '../utils/logger';

export interface HuggingFaceModel {
  id: string;
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag: string;
  library_name?: string;
  private: boolean;
  gated?: boolean;
  createdAt: string;
  lastModified: string;
}

export interface HuggingFaceDataset {
  id: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  size?: string;
  description?: string;
  private: boolean;
  gated?: boolean;
}

export interface HuggingFaceSpace {
  id: string;
  author: string;
  title: string;
  likes: number;
  sdk: string;
  tags: string[];
  private: boolean;
  runtime?: {
    stage: string;
    hardware: string;
  };
}

export interface TextGenerationParams {
  inputs: string;
  parameters?: {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repetition_penalty?: number;
    do_sample?: boolean;
    return_full_text?: boolean;
  };
}

export interface EmbeddingParams {
  inputs: string | string[];
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface ImageGenerationParams {
  inputs: string;
  parameters?: {
    negative_prompt?: string;
    height?: number;
    width?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
  };
}

export interface ClassificationParams {
  inputs: string;
  parameters?: {
    candidate_labels: string[];
    multi_label?: boolean;
  };
}

export interface SummarizationParams {
  inputs: string;
  parameters?: {
    max_length?: number;
    min_length?: number;
    do_sample?: boolean;
    temperature?: number;
  };
}

export interface TranslationParams {
  inputs: string;
  parameters?: {
    src_lang?: string;
    tgt_lang?: string;
  };
}

export class HuggingFaceClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api-inference.huggingface.co';
  private readonly hubUrl = 'https://huggingface.co/api';

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY!;
    if (!this.apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required');
    }
  }

  /**
   * Search models in HuggingFace Hub
   */
  async searchModels(params: {
    search?: string;
    filter?: string;
    sort?: 'downloads' | 'likes' | 'trending' | 'lastModified';
    direction?: 'asc' | 'desc';
    limit?: number;
    pipeline_tag?: string;
    library?: string;
  }): Promise<HuggingFaceModel[]> {
    try {
      logger.info('HuggingFaceClient', `Searching models with query: ${params.search || 'all'}`);

      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.filter) searchParams.append('filter', params.filter);
      if (params.sort) searchParams.append('sort', params.sort);
      if (params.direction) searchParams.append('direction', params.direction);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.pipeline_tag) searchParams.append('pipeline_tag', params.pipeline_tag);
      if (params.library) searchParams.append('library', params.library);

      const response = await fetch(`${this.hubUrl}/models?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const models = await response.json();
      logger.info('HuggingFaceClient', `Found ${models.length} models`);
      
      return models;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error searching models: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Search datasets in HuggingFace Hub
   */
  async searchDatasets(params: {
    search?: string;
    filter?: string;
    sort?: 'downloads' | 'likes' | 'trending' | 'lastModified';
    limit?: number;
  }): Promise<HuggingFaceDataset[]> {
    try {
      logger.info('HuggingFaceClient', `Searching datasets with query: ${params.search || 'all'}`);

      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.filter) searchParams.append('filter', params.filter);
      if (params.sort) searchParams.append('sort', params.sort);
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${this.hubUrl}/datasets?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const datasets = await response.json();
      logger.info('HuggingFaceClient', `Found ${datasets.length} datasets`);
      
      return datasets;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error searching datasets: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Text generation using HuggingFace models
   */
  async generateText(modelId: string, params: TextGenerationParams): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Generating text with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Text generation completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error generating text: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Generate embeddings using HuggingFace models
   */
  async generateEmbeddings(modelId: string, params: EmbeddingParams): Promise<number[][] | number[]> {
    try {
      logger.info('HuggingFaceClient', `Generating embeddings with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Embeddings generation completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error generating embeddings: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Image generation using HuggingFace models
   */
  async generateImage(modelId: string, params: ImageGenerationParams): Promise<Blob> {
    try {
      logger.info('HuggingFaceClient', `Generating image with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.blob();
      logger.info('HuggingFaceClient', `Image generation completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error generating image: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Text classification using HuggingFace models
   */
  async classifyText(modelId: string, params: ClassificationParams): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Classifying text with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Text classification completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error classifying text: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Text summarization using HuggingFace models
   */
  async summarizeText(modelId: string, params: SummarizationParams): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Summarizing text with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Text summarization completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error summarizing text: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Translation using HuggingFace models
   */
  async translateText(modelId: string, params: TranslationParams): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Translating text with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Translation completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error translating text: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Question answering using HuggingFace models
   */
  async answerQuestion(modelId: string, question: string, context: string): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Answering question with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            question,
            context
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Question answering completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error answering question: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Sentiment analysis using HuggingFace models
   */
  async analyzeSentiment(modelId: string, text: string): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Analyzing sentiment with model: ${modelId}`);

      const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text
        })
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Sentiment analysis completed`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error analyzing sentiment: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get recommended models for a specific task
   */
  async getRecommendedModels(taskType: string, limit: number = 10): Promise<HuggingFaceModel[]> {
    const taskMappings: Record<string, string> = {
      'text-generation': 'text-generation',
      'text-classification': 'text-classification',
      'question-answering': 'question-answering',
      'summarization': 'summarization',
      'translation': 'translation',
      'sentiment-analysis': 'text-classification',
      'embeddings': 'feature-extraction',
      'image-generation': 'text-to-image',
      'image-classification': 'image-classification',
      'object-detection': 'object-detection',
      'speech-recognition': 'automatic-speech-recognition',
      'text-to-speech': 'text-to-speech'
    };

    const pipelineTag = taskMappings[taskType];
    if (!pipelineTag) {
      logger.warn('HuggingFaceClient', `Unknown task type: ${taskType}`);
      return [];
    }

    return this.searchModels({
      pipeline_tag: pipelineTag,
      sort: 'downloads',
      direction: 'desc',
      limit
    });
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    try {
      logger.info('HuggingFaceClient', `Getting model info: ${modelId}`);

      const response = await fetch(`${this.hubUrl}/models/${modelId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('HuggingFaceClient', `Retrieved model info for: ${modelId}`);
      
      return result;
    } catch (error) {
      logger.error('HuggingFaceClient', `Error getting model info: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Find the best models for autonomous MCP tool creation
   */
  async findOptimalModelsForTask(
    taskContext: {
      taskType: string;
      requirements: string[];
      constraints: string[];
      expectedOutputs: string[];
    }
  ): Promise<{
    primaryModels: HuggingFaceModel[];
    supportingModels: HuggingFaceModel[];
    recommendations: string[];
  }> {
    const result = {
      primaryModels: [] as HuggingFaceModel[],
      supportingModels: [] as HuggingFaceModel[],
      recommendations: [] as string[]
    };

    try {
      // Determine primary task types
      const taskKeywords = taskContext.requirements.join(' ').toLowerCase();
      
      const taskMappings = [
        { keywords: ['text', 'generation', 'write', 'create'], task: 'text-generation' },
        { keywords: ['classify', 'categorize', 'label'], task: 'text-classification' },
        { keywords: ['question', 'answer', 'qa'], task: 'question-answering' },
        { keywords: ['summarize', 'summary'], task: 'summarization' },
        { keywords: ['translate', 'translation'], task: 'translation' },
        { keywords: ['sentiment', 'emotion', 'feeling'], task: 'sentiment-analysis' },
        { keywords: ['embedding', 'vector', 'similarity'], task: 'embeddings' },
        { keywords: ['image', 'generate', 'create'], task: 'image-generation' },
        { keywords: ['detect', 'identify', 'recognize'], task: 'object-detection' }
      ];

      // Find relevant tasks
      const relevantTasks = taskMappings
        .filter(mapping => 
          mapping.keywords.some(keyword => taskKeywords.includes(keyword))
        )
        .map(mapping => mapping.task);

      // Get models for each relevant task
      for (const task of relevantTasks) {
        const models = await this.getRecommendedModels(task, 5);
        if (task === relevantTasks[0]) {
          result.primaryModels.push(...models);
        } else {
          result.supportingModels.push(...models);
        }
      }

      // Generate recommendations
      if (result.primaryModels.length > 0) {
        result.recommendations.push(`Found ${result.primaryModels.length} primary models for ${relevantTasks[0]}`);
      }
      
      if (result.supportingModels.length > 0) {
        result.recommendations.push(`Found ${result.supportingModels.length} supporting models for additional capabilities`);
      }

      if (relevantTasks.length === 0) {
        result.recommendations.push('Consider using general-purpose text-generation models for flexible tool creation');
        result.primaryModels = await this.getRecommendedModels('text-generation', 5);
      }

      logger.info('HuggingFaceClient', `Found optimal models: ${result.primaryModels.length} primary, ${result.supportingModels.length} supporting`);

    } catch (error) {
      logger.error('HuggingFaceClient', `Error finding optimal models: ${(error as Error).message}`);
    }

    return result;
  }
}

// Singleton instance
export const huggingfaceClient = new HuggingFaceClient();