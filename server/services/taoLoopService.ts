/**
 * TAO Loop Service - Project Chimera Integration
 * Implements Think-Act-Observe pattern for enhanced AI workflow processing
 * Adapted from Project Chimera for Synapse AI
 */

import { AIIntegrationService } from './aiIntegration';
import { intelligentRoutingService } from './intelligentRouting';
import { taoStageRules, type TAOStage } from '../config/aiRules';

interface TAOTask {
  requirements: string;
  context?: {
    activeFile?: string;
    fileType?: string;
    openFiles?: string[];
    projectType?: string;
  };
  targetAgent?: string;
  complexity?: 'low' | 'medium' | 'high';
}

interface TAOStageResult {
  stage: TAOStage;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  timestamp: string;
  responseTime: number;
}

interface TAOLoopResult {
  taskId: string;
  stages: TAOStageResult[];
  finalResult: string;
  totalTime: number;
  success: boolean;
  metadata: {
    complexity: string;
    agentUsed: string;
    providersUsed: string[];
  };
}

export class TAOLoopService {
  private aiIntegration: AIIntegrationService;

  constructor(aiIntegration: AIIntegrationService) {
    this.aiIntegration = aiIntegration;
  }

  /**
   * Execute Project Chimera TAO Loop workflow
   */
  async executeTAOLoop(task: TAOTask): Promise<TAOLoopResult> {
    const taskId = this.generateTaskId();
    const startTime = Date.now();
    const stages: TAOStageResult[] = [];
    let success = true;

    console.log(`[TAOLoop] Starting TAO Loop execution for task: ${taskId}`);

    try {
      // Stage 1: OBSERVE
      const observeResult = await this.executeStage('OBSERVE', task, null);
      stages.push(observeResult);

      // Stage 2: THINK (based on observations)
      const thinkResult = await this.executeStage('THINK', task, observeResult.response);
      stages.push(thinkResult);

      // Stage 3: ACT (based on thinking)
      const actResult = await this.executeStage('ACT', task, thinkResult.response);
      stages.push(actResult);

      const totalTime = Date.now() - startTime;
      const finalResult = actResult.response;

      console.log(`[TAOLoop] TAO Loop completed successfully in ${totalTime}ms`);

      return {
        taskId,
        stages,
        finalResult,
        totalTime,
        success: true,
        metadata: {
          complexity: task.complexity || 'medium',
          agentUsed: task.targetAgent || 'auto-selected',
          providersUsed: Array.from(new Set(stages.map(s => s.provider)))
        }
      };

    } catch (error) {
      console.error(`[TAOLoop] TAO Loop failed:`, error);
      
      return {
        taskId,
        stages,
        finalResult: `TAO Loop execution failed: ${(error as Error).message}`,
        totalTime: Date.now() - startTime,
        success: false,
        metadata: {
          complexity: task.complexity || 'medium',
          agentUsed: task.targetAgent || 'auto-selected',
          providersUsed: Array.from(new Set(stages.map(s => s.provider)))
        }
      };
    }
  }

  /**
   * Execute a single TAO stage
   */
  private async executeStage(
    stage: TAOStage, 
    task: TAOTask, 
    previousStageOutput: string | null
  ): Promise<TAOStageResult> {
    const stageStartTime = Date.now();
    const stageRule = taoStageRules.find(rule => rule.stage === stage);
    
    if (!stageRule) {
      throw new Error(`No rule found for TAO stage: ${stage}`);
    }

    // Build stage-specific prompt using Project Chimera pattern
    let stagePrompt: string;
    
    switch (stage) {
      case 'OBSERVE':
        stagePrompt = `${stageRule.systemPrompt}\n\nOBSERVE: ${task.requirements}`;
        if (task.context?.activeFile) {
          stagePrompt += `\n\nContext: Working on file ${task.context.activeFile}`;
        }
        break;
        
      case 'THINK':
        stagePrompt = `${stageRule.systemPrompt}\n\nTHINK based on OBSERVE: ${previousStageOutput}`;
        break;
        
      case 'ACT':
        stagePrompt = `${stageRule.systemPrompt}\n\nACT on THINK: ${previousStageOutput}`;
        break;
        
      default:
        throw new Error(`Unknown TAO stage: ${stage}`);
    }

    console.log(`[TAOLoop] Executing ${stage} stage`);

    // Use intelligent routing to determine best provider/model for this stage
    const routingContext = {
      userMessage: stagePrompt,
      activeFile: task.context?.activeFile,
      fileType: task.context?.fileType,
      openFiles: task.context?.openFiles,
      projectType: task.context?.projectType,
      complexity: task.complexity,
      urgency: 'medium' as const
    };

    const routingDecision = await intelligentRoutingService.routeRequest(routingContext);

    // Override with stage-specific preferences if available
    let selectedProvider = routingDecision.selectedProvider;
    let selectedModel = routingDecision.selectedModel;

    // Apply Project Chimera stage preferences
    if (stageRule.preferredProviders.includes('deepseek') && selectedProvider !== 'deepseek') {
      selectedProvider = 'deepseek';
      selectedModel = stageRule.preferredModels.deepseek || 'deepseek-chat';
    }

    // Execute the AI request
    const aiResponse = await this.aiIntegration.processRequest({
      prompt: stagePrompt,
      provider: selectedProvider,
      model: selectedModel,
      maxTokens: this.getMaxTokensForStage(stage)
    });

    const responseTime = Date.now() - stageStartTime;

    return {
      stage,
      prompt: stagePrompt,
      response: aiResponse.content,
      provider: aiResponse.provider,
      model: aiResponse.model,
      timestamp: new Date().toISOString(),
      responseTime
    };
  }

  /**
   * Project Chimera task classification and routing
   */
  async classifyAndRoute(userInput: string, context?: any): Promise<{
    taskType: string;
    recommendedAgent: string;
    complexity: 'low' | 'medium' | 'high';
    shouldUseTAOLoop: boolean;
    reasoning: string[];
  }> {
    const input = userInput.toLowerCase();
    const reasoning: string[] = [];

    // Project Chimera task type detection
    let taskType = 'general';
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    let shouldUseTAOLoop = false;

    // Code tasks (from Project Chimera model_dispatcher)
    if (input.includes('code') || input.includes('function') || input.includes('debug') ||
        context?.fileType && ['.js', '.ts', '.py', '.java'].includes(context.fileType)) {
      taskType = 'code';
      complexity = input.includes('complex') || input.includes('architecture') ? 'high' : 'low';
      reasoning.push('Detected code-related task from Project Chimera patterns');
    }

    // Math tasks (from Project Chimera model_dispatcher)  
    else if (input.includes('math') || input.includes('calculate') || input.includes('formula')) {
      taskType = 'math';
      complexity = 'medium';
      reasoning.push('Detected mathematical task from Project Chimera patterns');
    }

    // Complex analysis that benefits from TAO Loop
    else if (input.includes('analyze') || input.includes('plan') || input.includes('design') ||
             input.includes('architecture') || input.includes('strategy')) {
      taskType = 'analysis';
      complexity = 'high';
      shouldUseTAOLoop = true;
      reasoning.push('Complex analysis task - recommended for TAO Loop processing');
    }

    // Multi-step tasks that benefit from TAO Loop
    else if (input.includes('step') || input.includes('process') || input.includes('workflow') ||
             input.includes('implement') && input.includes('plan')) {
      taskType = 'multi-step';
      complexity = 'high';
      shouldUseTAOLoop = true;
      reasoning.push('Multi-step task detected - benefits from TAO Loop structure');
    }

    // Determine recommended agent based on Project Chimera patterns
    let recommendedAgent = 'maestro';
    
    if (taskType === 'code') {
      recommendedAgent = 'ai-integration';
      reasoning.push('Routing to AI Assistant for code tasks');
    } else if (taskType === 'analysis' || shouldUseTAOLoop) {
      recommendedAgent = 'coordinator';
      reasoning.push('Routing to Coordinator for complex analysis');
    } else if (taskType === 'math') {
      recommendedAgent = 'cognitive-refiner';
      reasoning.push('Routing to Optimizer for mathematical tasks');
    }

    return {
      taskType,
      recommendedAgent,
      complexity,
      shouldUseTAOLoop,
      reasoning
    };
  }

  /**
   * Enhanced model selection using Project Chimera patterns
   */
  selectModelForTask(taskType: string, stage?: TAOStage): {
    provider: string;
    model: string;
    reasoning: string;
  } {
    // Project Chimera model selection logic
    if (taskType === 'code') {
      return {
        provider: 'deepseek',
        model: 'deepseek-coder',
        reasoning: 'Project Chimera pattern: DeepSeek Coder for code tasks'
      };
    }

    if (taskType === 'math') {
      return {
        provider: 'deepseek', 
        model: 'deepseek-v3',
        reasoning: 'Project Chimera pattern: DeepSeek V3 for math tasks'
      };
    }

    // TAO stage-based selection
    if (stage) {
      const stageRule = taoStageRules.find(rule => rule.stage === stage);
      if (stageRule) {
        const preferredProvider = stageRule.preferredProviders[0];
        const preferredModel = stageRule.preferredModels[preferredProvider];
        
        return {
          provider: preferredProvider,
          model: preferredModel,
          reasoning: `Project Chimera TAO stage: ${stage} prefers ${preferredProvider}`
        };
      }
    }

    // Default fallback
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      reasoning: 'Default model selection'
    };
  }

  // Utility methods
  private generateTaskId(): string {
    return `tao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMaxTokensForStage(stage: TAOStage): number {
    const tokenLimits: Record<TAOStage, number> = {
      'OBSERVE': 1000,  // Concise observations
      'THINK': 2000,    // Detailed reasoning
      'ACT': 3000       // Implementation details
    };
    return tokenLimits[stage] || 1500;
  }

  /**
   * Get TAO Loop execution history and metrics
   */
  getExecutionHistory(): any {
    // Placeholder for execution history tracking
    return {
      totalExecutions: 0,
      averageExecutionTime: 0,
      successRate: 0,
      stagePerformance: {
        OBSERVE: { avgTime: 0, successRate: 0 },
        THINK: { avgTime: 0, successRate: 0 },
        ACT: { avgTime: 0, successRate: 0 }
      }
    };
  }
}

// Export singleton instance
export const taoLoopService = new TAOLoopService(new AIIntegrationService());