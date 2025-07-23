import { huggingfaceClient } from './huggingfaceClient';
import type { HuggingFaceModel } from './huggingfaceClient';
import { smitheryClient } from './smitheryClient';
import { logger } from '../utils/logger';

export interface HuggingFaceEnhancedMCP {
  mcpId: string;
  name: string;
  description: string;
  huggingfaceModels: {
    primary: HuggingFaceModel[];
    supporting: HuggingFaceModel[];
    embeddings: HuggingFaceModel[];
  };
  enhancedCapabilities: {
    textGeneration: boolean;
    embeddings: boolean;
    classification: boolean;
    translation: boolean;
    summarization: boolean;
    imageGeneration: boolean;
    questionAnswering: boolean;
    sentimentAnalysis: boolean;
  };
  smartRouting: {
    modelSelection: string;
    fallbackChain: string[];
    performanceOptimization: boolean;
  };
  datasetIntegration: {
    trainingData: string[];
    benchmarkData: string[];
    fineTuningCapable: boolean;
  };
}

export interface TaskEnhancementContext {
  taskType: string;
  requirements: string[];
  constraints: string[];
  expectedOutputs: string[];
  complexity: 'low' | 'medium' | 'high';
  performanceTargets: {
    responseTime: number;
    accuracy: number;
    throughput: number;
  };
}

export interface HuggingFaceToolSpec {
  name: string;
  description: string;
  modelId: string;
  pipelineType: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  parameters: Record<string, any>;
  enhancementFeatures: {
    cachingEnabled: boolean;
    batchProcessing: boolean;
    streamingSupport: boolean;
    fallbackModels: string[];
  };
}

export class HuggingFaceEnhancer {
  constructor() {
    logger.info('HuggingFaceEnhancer', 'Initializing HuggingFace enhancement capabilities');
  }

  /**
   * Enhance autonomous MCP creation with HuggingFace models
   */
  async enhanceMcpWithHuggingFace(
    mcpContext: any,
    enhancementContext: TaskEnhancementContext
  ): Promise<HuggingFaceEnhancedMCP> {
    try {
      logger.info('HuggingFaceEnhancer', `Enhancing MCP with HuggingFace models for task: ${enhancementContext.taskType}`);

      // Phase 1: Find optimal HuggingFace models
      const modelRecommendations = await huggingfaceClient.findOptimalModelsForTask(enhancementContext);

      // Phase 2: Add embedding models for semantic search and similarity
      const embeddingModels = await huggingfaceClient.getRecommendedModels('embeddings', 3);

      // Phase 3: Create enhanced MCP specification
      const enhancedMcp: HuggingFaceEnhancedMCP = {
        mcpId: mcpContext.id || `hf-enhanced-${Date.now()}`,
        name: `${mcpContext.name} (HF Enhanced)`,
        description: `${mcpContext.description} Enhanced with HuggingFace AI models for advanced capabilities`,
        huggingfaceModels: {
          primary: modelRecommendations.primaryModels,
          supporting: modelRecommendations.supportingModels,
          embeddings: embeddingModels
        },
        enhancedCapabilities: this.determineCapabilities(modelRecommendations, enhancementContext),
        smartRouting: this.createSmartRoutingConfig(modelRecommendations),
        datasetIntegration: await this.analyzeDatasetRequirements(enhancementContext)
      };

      logger.info('HuggingFaceEnhancer', `Enhanced MCP with ${enhancedMcp.huggingfaceModels.primary.length} primary models and advanced AI capabilities`);

      return enhancedMcp;
    } catch (error) {
      logger.error('HuggingFaceEnhancer', `Error enhancing MCP: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Generate HuggingFace-enhanced Smithery MCP tools
   */
  async generateHuggingFaceTools(
    enhancementContext: TaskEnhancementContext,
    models: HuggingFaceModel[]
  ): Promise<HuggingFaceToolSpec[]> {
    const tools: HuggingFaceToolSpec[] = [];

    try {
      logger.info('HuggingFaceEnhancer', `Generating HuggingFace tools for ${models.length} models`);

      for (const model of models) {
        const tool = await this.createToolFromModel(model, enhancementContext);
        if (tool) {
          tools.push(tool);
        }
      }

      // Add multi-model orchestration tool
      if (models.length > 1) {
        const orchestrationTool = this.createMultiModelOrchestrationTool(models, enhancementContext);
        tools.push(orchestrationTool);
      }

      // Add embedding and similarity tools
      const embeddingTool = this.createEmbeddingTool(enhancementContext);
      tools.push(embeddingTool);

      // Add dataset processing tool
      const datasetTool = this.createDatasetProcessingTool(enhancementContext);
      tools.push(datasetTool);

      logger.info('HuggingFaceEnhancer', `Generated ${tools.length} HuggingFace-enhanced tools`);

    } catch (error) {
      logger.error('HuggingFaceEnhancer', `Error generating HuggingFace tools: ${(error as Error).message}`);
    }

    return tools;
  }

  /**
   * Create enhanced Smithery project with HuggingFace integration
   */
  async createEnhancedSmitheryProject(
    baseProject: any,
    enhancementContext: TaskEnhancementContext
  ): Promise<any> {
    try {
      logger.info('HuggingFaceEnhancer', `Creating enhanced Smithery project with HuggingFace integration`);

      // Get optimal models for the task
      const modelRecommendations = await huggingfaceClient.findOptimalModelsForTask(enhancementContext);
      const allModels = [...modelRecommendations.primaryModels, ...modelRecommendations.supportingModels];

      // Generate HuggingFace-enhanced tools
      const hfTools = await this.generateHuggingFaceTools(enhancementContext, allModels);

      // Create enhanced project specification
      const enhancedProject = {
        ...baseProject,
        id: `${baseProject.id}-hf-enhanced`,
        name: `${baseProject.name} (HF Enhanced)`,
        description: `${baseProject.description} Enhanced with HuggingFace AI models for advanced ML capabilities`,
        keywords: [
          ...baseProject.keywords,
          'huggingface',
          'ai-models',
          'machine-learning',
          'embeddings',
          'text-generation',
          'classification'
        ],
        tools: [
          ...baseProject.tools,
          ...hfTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            implementation: this.generateHuggingFaceToolImplementation(tool)
          }))
        ],
        config: [
          ...baseProject.config,
          {
            key: 'HUGGINGFACE_API_KEY',
            type: 'secret',
            description: 'HuggingFace API key for model inference',
            required: true
          },
          {
            key: 'DEFAULT_MODEL_CACHE_TTL',
            type: 'number',
            description: 'Cache TTL for model responses (seconds)',
            required: false,
            default: 300
          },
          {
            key: 'ENABLE_MODEL_FALLBACK',
            type: 'boolean',
            description: 'Enable automatic fallback to secondary models',
            required: false,
            default: true
          }
        ],
        dependencies: [
          ...baseProject.dependencies || [],
          '@huggingface/inference',
          'node-cache',
          'async-retry'
        ]
      };

      logger.info('HuggingFaceEnhancer', `Enhanced Smithery project with ${hfTools.length} HuggingFace tools`);

      return enhancedProject;
    } catch (error) {
      logger.error('HuggingFaceEnhancer', `Error creating enhanced Smithery project: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Analyze task requirements and recommend HuggingFace models
   */
  async analyzeAndRecommendModels(requirements: string[]): Promise<{
    recommendations: HuggingFaceModel[];
    analysis: {
      taskTypes: string[];
      complexity: string;
      recommendedPipelines: string[];
      performanceExpectations: any;
    };
  }> {
    try {
      logger.info('HuggingFaceEnhancer', `Analyzing requirements for HuggingFace model recommendations`);

      // Analyze requirements to determine task types
      const taskTypes = this.extractTaskTypes(requirements);
      
      // Get model recommendations for each task type
      const allRecommendations: HuggingFaceModel[] = [];
      const recommendedPipelines: string[] = [];

      for (const taskType of taskTypes) {
        const models = await huggingfaceClient.getRecommendedModels(taskType, 5);
        allRecommendations.push(...models);
        recommendedPipelines.push(taskType);
      }

      // Remove duplicates
      const uniqueRecommendations = allRecommendations.filter(
        (model, index, self) => self.findIndex(m => m.id === model.id) === index
      );

      const analysis = {
        taskTypes,
        complexity: this.assessComplexity(requirements),
        recommendedPipelines,
        performanceExpectations: this.estimatePerformance(uniqueRecommendations, requirements)
      };

      logger.info('HuggingFaceEnhancer', `Analyzed requirements and recommended ${uniqueRecommendations.length} models for ${taskTypes.length} task types`);

      return {
        recommendations: uniqueRecommendations,
        analysis
      };
    } catch (error) {
      logger.error('HuggingFaceEnhancer', `Error analyzing requirements: ${(error as Error).message}`);
      return {
        recommendations: [],
        analysis: {
          taskTypes: [],
          complexity: 'unknown',
          recommendedPipelines: [],
          performanceExpectations: {}
        }
      };
    }
  }

  /**
   * Private helper methods
   */
  private determineCapabilities(modelRecommendations: any, context: TaskEnhancementContext): any {
    const models = [...modelRecommendations.primaryModels, ...modelRecommendations.supportingModels];
    
    return {
      textGeneration: models.some(m => m.pipeline_tag === 'text-generation'),
      embeddings: models.some(m => m.pipeline_tag === 'feature-extraction'),
      classification: models.some(m => m.pipeline_tag === 'text-classification'),
      translation: models.some(m => m.pipeline_tag === 'translation'),
      summarization: models.some(m => m.pipeline_tag === 'summarization'),
      imageGeneration: models.some(m => m.pipeline_tag === 'text-to-image'),
      questionAnswering: models.some(m => m.pipeline_tag === 'question-answering'),
      sentimentAnalysis: models.some(m => m.pipeline_tag === 'text-classification')
    };
  }

  private createSmartRoutingConfig(modelRecommendations: any): any {
    const primaryModel = modelRecommendations.primaryModels[0];
    const fallbackModels = modelRecommendations.primaryModels.slice(1, 4).map((m: any) => m.id);

    return {
      modelSelection: primaryModel ? primaryModel.id : 'auto',
      fallbackChain: fallbackModels,
      performanceOptimization: true
    };
  }

  private async analyzeDatasetRequirements(context: TaskEnhancementContext): Promise<any> {
    try {
      // Search for relevant datasets
      const datasets = await huggingfaceClient.searchDatasets({
        search: context.taskType,
        limit: 5
      });

      return {
        trainingData: datasets.map(d => d.id),
        benchmarkData: datasets.filter(d => d.tags.includes('benchmark')).map(d => d.id),
        fineTuningCapable: context.complexity === 'high'
      };
    } catch (error) {
      return {
        trainingData: [],
        benchmarkData: [],
        fineTuningCapable: false
      };
    }
  }

  private async createToolFromModel(model: HuggingFaceModel, context: TaskEnhancementContext): Promise<HuggingFaceToolSpec | null> {
    const pipelineType = model.pipeline_tag;
    const toolName = `hf_${pipelineType.replace(/-/g, '_')}_${model.id.split('/').pop()}`;

    const baseInputSchema = {
      type: 'object',
      properties: {
        inputs: {
          type: 'string',
          description: 'Input text for processing'
        }
      },
      required: ['inputs']
    };

    const baseOutputSchema = {
      type: 'object',
      properties: {
        result: {
          type: 'array',
          description: 'Processing result from HuggingFace model'
        },
        model: {
          type: 'string',
          description: 'Model ID used for processing'
        },
        processing_time: {
          type: 'number',
          description: 'Processing time in milliseconds'
        }
      }
    };

    return {
      name: toolName,
      description: `HuggingFace ${pipelineType} using model ${model.id}`,
      modelId: model.id,
      pipelineType,
      inputSchema: baseInputSchema,
      outputSchema: baseOutputSchema,
      parameters: this.getDefaultParameters(pipelineType),
      enhancementFeatures: {
        cachingEnabled: true,
        batchProcessing: true,
        streamingSupport: pipelineType === 'text-generation',
        fallbackModels: []
      }
    };
  }

  private createMultiModelOrchestrationTool(models: HuggingFaceModel[], context: TaskEnhancementContext): HuggingFaceToolSpec {
    return {
      name: 'hf_multi_model_orchestrator',
      description: 'Orchestrate multiple HuggingFace models for complex tasks',
      modelId: 'multi-model',
      pipelineType: 'orchestration',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'Task to perform'
          },
          inputs: {
            type: 'string',
            description: 'Input data'
          },
          strategy: {
            type: 'string',
            enum: ['parallel', 'sequential', 'voting', 'best-of-n'],
            description: 'Orchestration strategy'
          }
        },
        required: ['task', 'inputs']
      },
      outputSchema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            description: 'Results from all models'
          },
          best_result: {
            type: 'object',
            description: 'Best result based on confidence scores'
          },
          execution_summary: {
            type: 'object',
            description: 'Execution statistics and performance metrics'
          }
        }
      },
      parameters: {},
      enhancementFeatures: {
        cachingEnabled: true,
        batchProcessing: true,
        streamingSupport: false,
        fallbackModels: models.map(m => m.id)
      }
    };
  }

  private createEmbeddingTool(context: TaskEnhancementContext): HuggingFaceToolSpec {
    return {
      name: 'hf_embeddings_generator',
      description: 'Generate embeddings for semantic search and similarity analysis',
      modelId: 'sentence-transformers/all-MiniLM-L6-v2',
      pipelineType: 'feature-extraction',
      inputSchema: {
        type: 'object',
        properties: {
          texts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of texts to embed'
          },
          normalize: {
            type: 'boolean',
            description: 'Whether to normalize embeddings',
            default: true
          }
        },
        required: ['texts']
      },
      outputSchema: {
        type: 'object',
        properties: {
          embeddings: {
            type: 'array',
            description: 'Generated embeddings'
          },
          dimensions: {
            type: 'number',
            description: 'Embedding dimensions'
          }
        }
      },
      parameters: {},
      enhancementFeatures: {
        cachingEnabled: true,
        batchProcessing: true,
        streamingSupport: false,
        fallbackModels: ['sentence-transformers/all-mpnet-base-v2']
      }
    };
  }

  private createDatasetProcessingTool(context: TaskEnhancementContext): HuggingFaceToolSpec {
    return {
      name: 'hf_dataset_processor',
      description: 'Process and analyze HuggingFace datasets',
      modelId: 'dataset-processor',
      pipelineType: 'dataset-processing',
      inputSchema: {
        type: 'object',
        properties: {
          dataset_id: {
            type: 'string',
            description: 'HuggingFace dataset ID'
          },
          operation: {
            type: 'string',
            enum: ['load', 'sample', 'filter', 'transform', 'analyze'],
            description: 'Dataset operation to perform'
          },
          parameters: {
            type: 'object',
            description: 'Operation-specific parameters'
          }
        },
        required: ['dataset_id', 'operation']
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: {
            type: 'object',
            description: 'Operation result'
          },
          metadata: {
            type: 'object',
            description: 'Dataset metadata'
          },
          statistics: {
            type: 'object',
            description: 'Dataset statistics'
          }
        }
      },
      parameters: {},
      enhancementFeatures: {
        cachingEnabled: true,
        batchProcessing: true,
        streamingSupport: true,
        fallbackModels: []
      }
    };
  }

  private generateHuggingFaceToolImplementation(tool: HuggingFaceToolSpec): string {
    return `
        const startTime = Date.now();
        
        try {
          // Initialize HuggingFace client
          const hf = new HfInference(ctx.config.HUGGINGFACE_API_KEY);
          
          // Validate input
          if (!input || !input.inputs) {
            throw new Error('Missing required input: inputs');
          }
          
          // Configure model parameters
          const modelParams = {
            ...${JSON.stringify(tool.parameters)},
            ...input.parameters
          };
          
          // Process with HuggingFace model
          let result;
          
          switch ('${tool.pipelineType}') {
            case 'text-generation':
              result = await hf.textGeneration({
                model: '${tool.modelId}',
                inputs: input.inputs,
                parameters: modelParams
              });
              break;
              
            case 'text-classification':
              result = await hf.textClassification({
                model: '${tool.modelId}',
                inputs: input.inputs
              });
              break;
              
            case 'feature-extraction':
              result = await hf.featureExtraction({
                model: '${tool.modelId}',
                inputs: input.inputs
              });
              break;
              
            case 'question-answering':
              result = await hf.questionAnswering({
                model: '${tool.modelId}',
                inputs: {
                  question: input.question,
                  context: input.context
                }
              });
              break;
              
            default:
              throw new Error(\`Unsupported pipeline type: ${tool.pipelineType}\`);
          }
          
          const processingTime = Date.now() - startTime;
          
          return {
            result,
            model: '${tool.modelId}',
            processing_time: processingTime,
            tool: '${tool.name}',
            timestamp: new Date().toISOString()
          };
          
        } catch (error) {
          // Handle errors with fallback models if configured
          if (ctx.config.ENABLE_MODEL_FALLBACK && ${JSON.stringify(tool.enhancementFeatures.fallbackModels)}.length > 0) {
            // TODO: Implement fallback logic
            console.warn(\`Primary model failed, attempting fallback: \${error.message}\`);
          }
          
          throw new Error(\`HuggingFace ${tool.pipelineType} error: \${error.message}\`);
        }`;
  }

  private extractTaskTypes(requirements: string[]): string[] {
    const requirementText = requirements.join(' ').toLowerCase();
    const taskTypes = [];

    const patterns = [
      { pattern: /generat|creat|writ/, type: 'text-generation' },
      { pattern: /classif|categor|label/, type: 'text-classification' },
      { pattern: /question|answer|qa/, type: 'question-answering' },
      { pattern: /summar/, type: 'summarization' },
      { pattern: /translat/, type: 'translation' },
      { pattern: /sentiment|emotion/, type: 'text-classification' },
      { pattern: /embed|vector|similar/, type: 'feature-extraction' },
      { pattern: /image.*generat/, type: 'text-to-image' }
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(requirementText)) {
        taskTypes.push(type);
      }
    }

    return taskTypes.length > 0 ? taskTypes : ['text-generation'];
  }

  private assessComplexity(requirements: string[]): string {
    const totalWords = requirements.join(' ').split(/\s+/).length;
    const complexityKeywords = requirements.join(' ').toLowerCase();
    
    let complexityScore = 0;
    
    if (totalWords > 50) complexityScore += 1;
    if (complexityKeywords.includes('multiple')) complexityScore += 1;
    if (complexityKeywords.includes('advanced')) complexityScore += 1;
    if (complexityKeywords.includes('complex')) complexityScore += 2;
    if (requirements.length > 5) complexityScore += 1;
    
    if (complexityScore >= 3) return 'high';
    if (complexityScore >= 1) return 'medium';
    return 'low';
  }

  private estimatePerformance(models: HuggingFaceModel[], requirements: string[]): any {
    const avgDownloads = models.reduce((sum, model) => sum + model.downloads, 0) / models.length;
    
    return {
      expectedResponseTime: models.length > 3 ? '5-10s' : '2-5s',
      expectedAccuracy: avgDownloads > 10000 ? 'high' : 'medium',
      throughputEstimate: '10-50 requests/minute',
      resourceUsage: 'low-medium'
    };
  }

  private getDefaultParameters(pipelineType: string): Record<string, any> {
    const parameterMap: Record<string, any> = {
      'text-generation': {
        max_new_tokens: 100,
        temperature: 0.7,
        do_sample: true
      },
      'text-classification': {},
      'feature-extraction': {},
      'question-answering': {},
      'summarization': {
        max_length: 150,
        min_length: 30
      },
      'translation': {}
    };

    return parameterMap[pipelineType] || {};
  }
}

// Singleton instance
export const huggingfaceEnhancer = new HuggingFaceEnhancer();