export interface TaskClassificationRequest {
  userInput: string;
  context: {
    activeFile?: string;
    fileType?: string;
    projectContext?: string;
    [key: string]: any;
  };
}

export interface TaskClassificationResult {
  taskType: string;
  recommendedAgent: string;
  complexity: 'low' | 'medium' | 'high';
  shouldUseTAOLoop: boolean;
  reasoning: string[];
  modelRecommendation: {
    provider: string;
    model: string;
    reasoning: string;
  };
}

export class TaskClassifier {
  /**
   * Classify task type based on input and context
   */
  async classifyTask(request: TaskClassificationRequest): Promise<TaskClassificationResult> {
    const { userInput, context } = request;
    const input = userInput.toLowerCase();

    // Analyze task type
    const taskType = this.identifyTaskType(input);
    
    // Determine complexity
    const complexity = this.assessComplexity(input, context);
    
    // Recommend agent based on task type
    const recommendedAgent = this.recommendAgent(taskType, complexity);
    
    // Determine if TAO Loop is needed
    const shouldUseTAOLoop = this.shouldUseTAOLoop(taskType, complexity, input);
    
    // Model recommendation based on Project Chimera patterns
    const modelRecommendation = this.recommendModel(taskType, context);
    
    // Build reasoning
    const reasoning = this.buildReasoning(taskType, complexity, shouldUseTAOLoop, recommendedAgent);

    return {
      taskType,
      recommendedAgent,
      complexity,
      shouldUseTAOLoop,
      reasoning,
      modelRecommendation
    };
  }

  private identifyTaskType(input: string): string {
    const patterns = {
      'code': [
        'function', 'method', 'class', 'algorithm', 'programming', 'debug',
        'implement', 'write code', 'develop', 'coding', 'script', 'api',
        'variable', 'loop', 'condition', 'syntax', 'compile', 'execute'
      ],
      'analysis': [
        'analyze', 'study', 'examine', 'investigate', 'research', 'review',
        'evaluate', 'assess', 'compare', 'contrast', 'interpret', 'understand'
      ],
      'planning': [
        'plan', 'strategy', 'roadmap', 'timeline', 'schedule', 'organize',
        'structure', 'design architecture', 'blueprint', 'framework'
      ],
      'creative': [
        'create', 'generate', 'write', 'compose', 'design', 'build',
        'make', 'produce', 'craft', 'invent', 'innovate'
      ],
      'coordination': [
        'coordinate', 'manage', 'orchestrate', 'sync', 'integrate',
        'workflow', 'process', 'pipeline', 'automation'
      ],
      'question': [
        'what', 'how', 'why', 'when', 'where', 'which', 'explain',
        'tell me', 'help me understand', '?'
      ],
      'math': [
        'calculate', 'compute', 'solve', 'equation', 'formula', 'mathematics',
        'statistics', 'probability', 'algebra', 'geometry'
      ]
    };

    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return type;
      }
    }

    return 'general';
  }

  private assessComplexity(input: string, context: any): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Length-based complexity
    if (input.length > 500) complexityScore += 2;
    else if (input.length > 200) complexityScore += 1;

    // Multi-step indicators
    const multiStepKeywords = [
      'step by step', 'first', 'then', 'after', 'finally', 'multiple',
      'several', 'various', 'different', 'and then', 'followed by'
    ];
    if (multiStepKeywords.some(keyword => input.includes(keyword))) {
      complexityScore += 2;
    }

    // Context complexity
    if (context.projectContext && context.projectContext.length > 100) {
      complexityScore += 1;
    }
    if (context.activeFile) complexityScore += 1;

    // Technical depth indicators
    const technicalKeywords = [
      'architecture', 'design pattern', 'optimization', 'performance',
      'scalability', 'integration', 'synchronization', 'algorithm'
    ];
    if (technicalKeywords.some(keyword => input.includes(keyword))) {
      complexityScore += 2;
    }

    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private recommendAgent(taskType: string, complexity: 'low' | 'medium' | 'high'): string {
    const agentMapping = {
      'code': complexity === 'high' ? 'maestro' : 'ai-integration',
      'analysis': 'cognitive-refiner',
      'planning': 'coordinator',
      'creative': 'ai-integration',
      'coordination': 'coordinator',
      'question': 'maestro',
      'math': 'ai-integration',
      'general': complexity === 'high' ? 'maestro' : 'ai-integration'
    };

    return agentMapping[taskType] || 'maestro';
  }

  private shouldUseTAOLoop(taskType: string, complexity: 'low' | 'medium' | 'high', input: string): boolean {
    // Always use TAO for high complexity
    if (complexity === 'high') return true;

    // Use TAO for specific task types that benefit from structured thinking
    const taoFriendlyTasks = ['analysis', 'planning', 'coordination'];
    if (taoFriendlyTasks.includes(taskType)) return true;

    // Use TAO for multi-step requests
    const multiStepIndicators = [
      'step by step', 'first', 'then', 'analyze and', 'create and',
      'build and', 'plan and', 'design and implement'
    ];
    if (multiStepIndicators.some(indicator => input.includes(indicator))) {
      return true;
    }

    return false;
  }

  private recommendModel(taskType: string, context: any): {
    provider: string;
    model: string;
    reasoning: string;
  } {
    // Project Chimera patterns for model selection
    const modelMappings = {
      'code': {
        provider: 'deepseek',
        model: 'deepseek-coder',
        reasoning: 'Project Chimera pattern: DeepSeek Coder for code tasks'
      },
      'math': {
        provider: 'deepseek',
        model: 'deepseek-v3',
        reasoning: 'Project Chimera pattern: DeepSeek V3 for mathematical reasoning'
      },
      'analysis': {
        provider: 'deepseek',
        model: 'deepseek-reasoner',
        reasoning: 'Project Chimera pattern: DeepSeek Reasoner for analytical tasks'
      },
      'planning': {
        provider: 'deepseek',
        model: 'deepseek-chat',
        reasoning: 'Project Chimera pattern: DeepSeek Chat for planning and coordination'
      },
      'creative': {
        provider: 'deepseek',
        model: 'deepseek-chat',
        reasoning: 'Project Chimera pattern: DeepSeek Chat for creative tasks'
      }
    };

    return modelMappings[taskType] || {
      provider: 'deepseek',
      model: 'deepseek-chat',
      reasoning: 'Default DeepSeek Chat for general tasks'
    };
  }

  private buildReasoning(
    taskType: string,
    complexity: 'low' | 'medium' | 'high',
    shouldUseTAOLoop: boolean,
    recommendedAgent: string
  ): string[] {
    const reasoning = [];

    reasoning.push(`Detected ${taskType}-related task from Project Chimera patterns`);
    reasoning.push(`Assessed complexity as ${complexity} based on input analysis`);
    
    if (shouldUseTAOLoop) {
      reasoning.push('Recommended TAO Loop for structured thinking and comprehensive processing');
    } else {
      reasoning.push('Direct processing recommended for efficiency');
    }

    reasoning.push(`Routing to ${recommendedAgent} agent based on task requirements`);

    return reasoning;
  }
}

export const taskClassifier = new TaskClassifier();