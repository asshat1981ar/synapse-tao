import { AIIntegrationService } from './aiIntegration.js';
import { IntelligentRoutingService } from './intelligentRouting.js';
import { taskClassifier } from './taskClassifier.js';
import { logger } from '../utils/logger.js';

export interface MaestroRequest {
  input: string;
  context?: {
    activeFile?: string;
    fileType?: string;
    projectContext?: string;
    userPreferences?: Record<string, any>;
  };
  options?: {
    forceTAO?: boolean;
    complexity?: 'low' | 'medium' | 'high';
    targetDomain?: string;
  };
}

export interface TAOStageExecution {
  stage: 'OBSERVE' | 'THINK' | 'ACT';
  prompt: string;
  model: string;
  provider: string;
  response: string;
  confidence: number;
  executionTime: number;
  metadata: {
    reasoning: string;
    selectedAgent: string;
    contextUsed: string[];
  };
}

export interface MaestroResponse {
  finalResult: string;
  executionPath: 'DIRECT' | 'TAO_LOOP';
  stages: TAOStageExecution[];
  totalTime: number;
  confidence: number;
  metadata: {
    taskType: string;
    complexity: string;
    modelsUsed: string[];
    agentsUsed: string[];
    reasoningChain: string[];
  };
}

export class MaestroOrchestrator {
  private aiService: AIIntegrationService;
  private routingService: IntelligentRoutingService;
  private requestId: string = '';

  constructor() {
    this.aiService = new AIIntegrationService();
    this.routingService = new IntelligentRoutingService();
  }

  /**
   * Main orchestration entry point - decides execution path and implements TAO loop
   */
  async orchestrate(request: MaestroRequest): Promise<MaestroResponse> {
    this.requestId = `maestro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    logger.info(`Starting orchestration for request: ${this.requestId}`, {
      service: 'Maestro',
      method: 'orchestrate',
      inputLength: request.input.length
    });

    try {
      // Stage 1: Classify and analyze the request
      const classification = await this.classifyRequest(request);
      
      // Stage 2: Decide execution path
      const shouldUseTAO = this.shouldUseTAOLoop(classification, request);
      
      if (shouldUseTAO) {
        logger.info('Executing TAO Loop for complex task', {
          service: 'Maestro',
          method: 'orchestrate',
          taskType: classification.taskType,
          complexity: classification.complexity
        });
        return await this.executeTAOLoop(request, classification);
      } else {
        logger.info('Executing direct processing for simple task', {
          service: 'Maestro',
          method: 'orchestrate',
          taskType: classification.taskType,
          complexity: classification.complexity
        });
        return await this.executeDirectProcessing(request, classification);
      }

    } catch (error) {
      logger.error('Orchestration failed', error as Error, {
        service: 'Maestro',
        method: 'orchestrate',
        requestId: this.requestId
      });
      throw new Error(`Maestro orchestration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Classify the incoming request and determine optimal processing approach
   */
  private async classifyRequest(request: MaestroRequest): Promise<any> {
    const classification = await taskClassifier.classifyTask({
      userInput: request.input,
      context: request.context || {}
    });

    // Enhanced classification with Project Chimera patterns
    const enhancedClassification = {
      ...classification,
      complexity: request.options?.complexity || this.assessComplexity(request.input),
      requiresMultiStep: this.requiresMultiStepProcessing(request.input),
      domainSpecific: this.identifyDomain(request.input),
      contextDependency: this.assessContextDependency(request.context)
    };

    logger.debug('Task classification completed', {
      service: 'Maestro',
      method: 'classifyRequest',
      classification: enhancedClassification
    });
    return enhancedClassification;
  }

  /**
   * Determine if TAO Loop is needed based on task complexity
   */
  private shouldUseTAOLoop(classification: any, request: MaestroRequest): boolean {
    // Force TAO if explicitly requested
    if (request.options?.forceTAO) return true;

    // Use TAO for complex, multi-step, or analysis tasks
    return (
      classification.complexity === 'high' ||
      classification.requiresMultiStep ||
      classification.taskType === 'analysis' ||
      classification.taskType === 'planning' ||
      classification.taskType === 'coordination' ||
      request.input.length > 500 ||
      (request.context?.projectContext && request.context.projectContext.length > 100)
    );
  }

  /**
   * Execute the full TAO Loop with intelligent model selection
   */
  private async executeTAOLoop(request: MaestroRequest, classification: any): Promise<MaestroResponse> {
    const stages: TAOStageExecution[] = [];
    const startTime = Date.now();

    // OBSERVE Stage - Analyze and understand
    const observeStage = await this.executeStage('OBSERVE', {
      prompt: this.buildObservePrompt(request, classification),
      context: request.context,
      classification
    });
    stages.push(observeStage);

    // THINK Stage - Reason and plan based on observations
    const thinkStage = await this.executeStage('THINK', {
      prompt: this.buildThinkPrompt(request, classification, observeStage.response),
      context: request.context,
      classification,
      previousStage: observeStage
    });
    stages.push(thinkStage);

    // ACT Stage - Execute the plan
    const actStage = await this.executeStage('ACT', {
      prompt: this.buildActPrompt(request, classification, observeStage.response, thinkStage.response),
      context: request.context,
      classification,
      previousStages: [observeStage, thinkStage]
    });
    stages.push(actStage);

    const totalTime = Date.now() - startTime;
    const confidence = this.calculateOverallConfidence(stages);

    return {
      finalResult: actStage.response,
      executionPath: 'TAO_LOOP',
      stages,
      totalTime,
      confidence,
      metadata: {
        taskType: classification.taskType,
        complexity: classification.complexity,
        modelsUsed: stages.map(s => s.model),
        agentsUsed: stages.map(s => s.metadata.selectedAgent),
        reasoningChain: stages.map(s => s.metadata.reasoning)
      }
    };
  }

  /**
   * Execute direct processing for simple tasks
   */
  private async executeDirectProcessing(request: MaestroRequest, classification: any): Promise<MaestroResponse> {
    const startTime = Date.now();

    // Use classification to determine optimal model and provider
    const routing = {
      agent: classification.recommendedAgent,
      provider: classification.modelRecommendation.provider,
      model: classification.modelRecommendation.model,
      confidence: 0.9
    };

    logger.debug(`Direct processing with ${routing.provider}:${routing.model}`, {
      service: 'Maestro',
      method: 'executeDirectProcessing'
    });

    const response = await this.aiService.processRequest({
      prompt: request.input,
      provider: routing.provider,
      model: routing.model
    });

    const stage: TAOStageExecution = {
      stage: 'ACT', // Direct execution is essentially the ACT stage
      prompt: request.input,
      model: routing.model,
      provider: routing.provider,
      response: response.content,
      confidence: routing.confidence,
      executionTime: response.responseTime,
      metadata: {
        reasoning: 'Direct execution - simple task classification',
        selectedAgent: routing.agent,
        contextUsed: request.context ? Object.keys(request.context) : []
      }
    };

    return {
      finalResult: response.content,
      executionPath: 'DIRECT',
      stages: [stage],
      totalTime: Date.now() - startTime,
      confidence: routing.confidence,
      metadata: {
        taskType: classification.taskType,
        complexity: classification.complexity,
        modelsUsed: [routing.model],
        agentsUsed: [routing.agent],
        reasoningChain: ['Direct execution based on task classification']
      }
    };
  }

  /**
   * Execute a single TAO stage with intelligent model selection
   */
  private async executeStage(stage: 'OBSERVE' | 'THINK' | 'ACT', options: any): Promise<TAOStageExecution> {
    const stageStartTime = Date.now();

    // Stage-specific routing based on Project Chimera patterns
    const routing = await this.getStageSpecificRouting(stage, options);

    logger.debug(`Executing ${stage} stage with ${routing.provider}:${routing.model}`, {
      service: 'Maestro',
      method: 'executeStage',
      stage
    });

    const response = await this.aiService.processRequest({
      prompt: options.prompt,
      provider: routing.provider,
      model: routing.model
    });

    return {
      stage,
      prompt: options.prompt,
      model: routing.model,
      provider: routing.provider,
      response: response.content,
      confidence: routing.confidence,
      executionTime: Date.now() - stageStartTime,
      metadata: {
        reasoning: routing.reasoning || `${stage} stage execution with optimized model selection`,
        selectedAgent: routing.agent,
        contextUsed: options.context ? Object.keys(options.context) : []
      }
    };
  }

  /**
   * Get stage-specific routing based on TAO patterns
   */
  private async getStageSpecificRouting(stage: 'OBSERVE' | 'THINK' | 'ACT', options: any) {
    switch (stage) {
      case 'OBSERVE':
        // Use analytical models for observation
        return {
          agent: 'cognitive-refiner',
          provider: 'deepseek',
          model: 'deepseek-chat',
          confidence: 0.9,
          reasoning: 'OBSERVE stage using cognitive refiner for analysis'
        };

      case 'THINK':
        // Use reasoning models for thinking  
        return {
          agent: 'maestro',
          provider: 'deepseek',
          model: 'deepseek-v3',
          confidence: 0.9,
          reasoning: 'THINK stage using maestro for reasoning'
        };

      case 'ACT':
        // Use execution-focused models for action
        return {
          agent: 'ai-integration',
          provider: 'deepseek',
          model: 'deepseek-coder',
          confidence: 0.9,
          reasoning: 'ACT stage using ai-integration for execution'
        };

      default:
        throw new Error(`Unknown TAO stage: ${stage}`);
    }
  }

  /**
   * Build OBSERVE stage prompt
   */
  private buildObservePrompt(request: MaestroRequest, classification: any): string {
    return `OBSERVE: Carefully analyze this request and current context.

Request: ${request.input}

Task Classification: ${classification.taskType} (${classification.complexity} complexity)

Context:
${request.context?.activeFile ? `- Active File: ${request.context.activeFile}` : ''}
${request.context?.fileType ? `- File Type: ${request.context.fileType}` : ''}
${request.context?.projectContext ? `- Project Context: ${request.context.projectContext}` : ''}

Your task is to observe and understand:
1. What exactly is being requested?
2. What context is available and relevant?
3. What information might be missing?
4. What are the key challenges or considerations?
5. What domain expertise is required?

Provide a clear, analytical observation that will guide the thinking and action stages.`;
  }

  /**
   * Build THINK stage prompt
   */
  private buildThinkPrompt(request: MaestroRequest, classification: any, observations: string): string {
    return `THINK: Based on the observations, reason through the approach and plan.

Original Request: ${request.input}

Observations: ${observations}

Your task is to think through:
1. What is the best approach to fulfill this request?
2. What steps are needed and in what order?
3. What potential challenges or edge cases exist?
4. What resources, tools, or knowledge are required?
5. What would success look like?

Develop a clear, logical plan that the action stage can execute effectively.`;
  }

  /**
   * Build ACT stage prompt
   */
  private buildActPrompt(request: MaestroRequest, classification: any, observations: string, thinking: string): string {
    return `ACT: Execute the plan based on observations and thinking.

Original Request: ${request.input}

Observations: ${observations}

Plan: ${thinking}

Your task is to act by:
1. Implementing the planned solution
2. Providing concrete, actionable results
3. Including code, explanations, or step-by-step instructions as appropriate
4. Addressing any remaining edge cases or considerations
5. Ensuring the result fully satisfies the original request

Execute the plan and provide the final deliverable.`;
  }

  // Helper methods for classification
  private assessComplexity(input: string): 'low' | 'medium' | 'high' {
    if (input.length < 100) return 'low';
    if (input.length < 300) return 'medium';
    return 'high';
  }

  private requiresMultiStepProcessing(input: string): boolean {
    const multiStepIndicators = [
      'step by step', 'first', 'then', 'after that', 'finally',
      'multiple', 'several', 'various', 'different',
      'analyze and', 'create and', 'build and', 'plan and'
    ];
    return multiStepIndicators.some(indicator => 
      input.toLowerCase().includes(indicator)
    );
  }

  private identifyDomain(input: string): string {
    const domains = {
      'code': ['function', 'class', 'method', 'algorithm', 'programming', 'debug'],
      'analysis': ['analyze', 'study', 'examine', 'investigate', 'research'],
      'planning': ['plan', 'strategy', 'roadmap', 'timeline', 'schedule'],
      'creative': ['create', 'design', 'generate', 'write', 'compose'],
      'coordination': ['coordinate', 'manage', 'organize', 'orchestrate']
    };

    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
        return domain;
      }
    }
    return 'general';
  }

  private assessContextDependency(context?: any): 'low' | 'medium' | 'high' {
    if (!context) return 'low';
    const contextItems = Object.keys(context).length;
    if (contextItems < 2) return 'low';
    if (contextItems < 4) return 'medium';
    return 'high';
  }

  private calculateOverallConfidence(stages: TAOStageExecution[]): number {
    const avgConfidence = stages.reduce((sum, stage) => sum + stage.confidence, 0) / stages.length;
    return Math.round(avgConfidence * 100) / 100;
  }
}

export const maestroOrchestrator = new MaestroOrchestrator();