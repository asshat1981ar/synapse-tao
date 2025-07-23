import { aiIntegrationService } from './aiIntegration';
import { logger } from '../utils/logger';
import type { OrchestrationContext } from './autonomousMcpCreator';

export interface ContextAnalysisResult {
  complexity: 'low' | 'medium' | 'high';
  recommendedTools: string[];
  resourceEstimate: {
    cpu: string;
    memory: string;
    storage: string;
    estimatedDuration: string;
  };
  riskFactors: string[];
  optimizations: string[];
  dependencies: {
    required: string[];
    optional: string[];
    conflicts: string[];
  };
}

export interface TaskDecomposition {
  phases: Array<{
    name: string;
    description: string;
    estimatedDuration: string;
    dependencies: string[];
    tools: string[];
    risks: string[];
  }>;
  criticalPath: string[];
  parallelizable: string[];
  bottlenecks: string[];
}

export class OrchestrationContextAnalyzer {
  
  /**
   * Analyze orchestration context for complexity and requirements
   */
  async analyzeContext(context: OrchestrationContext): Promise<ContextAnalysisResult> {
    try {
      logger.info('OrchestrationContextAnalyzer', `Analyzing context for task: ${context.taskId}`);

      const analysisPrompt = this.buildContextAnalysisPrompt(context);
      const response = await aiIntegrationService.processRequest({
        prompt: analysisPrompt,
        provider: 'deepseek',
        model: 'deepseek-v3',
        maxTokens: 2000
      });

      const analysis = await this.parseAnalysisResponse(response.content, context);
      
      logger.info('OrchestrationContextAnalyzer', `Context analysis completed: ${analysis.complexity} complexity, ${analysis.recommendedTools.length} tools, ${analysis.riskFactors.length} risks`);
      
      return analysis;
    } catch (error) {
      logger.error('OrchestrationContextAnalyzer', `Error analyzing context: ${(error as Error).message}`);
      return this.createFallbackAnalysis(context);
    }
  }

  /**
   * Decompose task into manageable phases
   */
  async decomposeTask(context: OrchestrationContext): Promise<TaskDecomposition> {
    try {
      logger.info('OrchestrationContextAnalyzer', `Decomposing task: ${context.taskId}`);

      const decompositionPrompt = this.buildDecompositionPrompt(context);
      const response = await aiIntegrationService.processRequest({
        prompt: decompositionPrompt,
        provider: 'deepseek',
        model: 'deepseek-coder',
        maxTokens: 2500
      });

      const decomposition = await this.parseDecompositionResponse(response.content, context);
      
      logger.info('OrchestrationContextAnalyzer', `Task decomposition completed: ${decomposition.phases.length} phases, ${decomposition.criticalPath.length} critical path items`);
      
      return decomposition;
    } catch (error) {
      logger.error('OrchestrationContextAnalyzer', `Error decomposing task: ${(error as Error).message}`);
      return this.createFallbackDecomposition(context);
    }
  }

  /**
   * Identify tool requirements based on context
   */
  async identifyToolRequirements(context: OrchestrationContext): Promise<{
    coreTools: string[];
    supportingTools: string[];
    integrationTools: string[];
    monitoringTools: string[];
  }> {
    try {
      const toolPrompt = `
Analyze these requirements and identify specific tools needed:

Task Type: ${context.taskType}
Requirements: ${context.requirements.join(', ')}
Expected Outputs: ${context.expectedOutputs.join(', ')}

Categorize tools into:
1. Core Tools (essential for main functionality)
2. Supporting Tools (helpers and utilities)
3. Integration Tools (external connections)
4. Monitoring Tools (health checks and metrics)

For each tool, consider:
- Input/output requirements
- Processing capabilities needed
- External dependencies
- Performance characteristics
`;

      const response = await aiIntegrationService.processRequest({
        prompt: toolPrompt,
        provider: 'deepseek',
        model: 'deepseek-coder',
        maxTokens: 1500
      });

      return this.parseToolRequirements(response.content);
    } catch (error) {
      logger.error('OrchestrationContextAnalyzer', `Error identifying tool requirements: ${(error as Error).message}`);
      return this.createFallbackToolRequirements(context);
    }
  }

  /**
   * Assess deployment readiness
   */
  async assessDeploymentReadiness(context: OrchestrationContext): Promise<{
    readiness: 'ready' | 'needs_preparation' | 'blocked';
    blockers: string[];
    preparations: string[];
    recommendations: string[];
  }> {
    const assessment = {
      readiness: 'ready' as 'ready' | 'needs_preparation' | 'blocked',
      blockers: [] as string[],
      preparations: [] as string[],
      recommendations: [] as string[]
    };

    // Check for common blockers
    if (context.requirements.length === 0) {
      assessment.blockers.push('No requirements specified');
    }

    if (context.dependencies.some(dep => dep.includes('external-api') || dep.includes('third-party'))) {
      assessment.preparations.push('Verify external API access and credentials');
    }

    if (context.complexity === 'high' && context.timeline.includes('minutes')) {
      assessment.blockers.push('High complexity task with insufficient timeline');
    }

    // Add recommendations
    if (context.expectedOutputs.length === 0) {
      assessment.recommendations.push('Define expected outputs for better tool generation');
    }

    if (context.constraints.length === 0) {
      assessment.recommendations.push('Add constraints to ensure system compatibility');
    }

    // Determine overall readiness
    if (assessment.blockers.length > 0) {
      assessment.readiness = 'blocked';
    } else if (assessment.preparations.length > 0) {
      assessment.readiness = 'needs_preparation';
    }

    return assessment;
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizations(context: OrchestrationContext): Promise<{
    performance: string[];
    reliability: string[];
    scalability: string[];
    cost: string[];
  }> {
    const optimizations = {
      performance: [] as string[],
      reliability: [] as string[],
      scalability: [] as string[],
      cost: [] as string[]
    };

    // Performance optimizations
    if (context.taskType === 'data_processing') {
      optimizations.performance.push('Use streaming for large datasets');
      optimizations.performance.push('Implement parallel processing where possible');
    }

    if (context.complexity === 'high') {
      optimizations.performance.push('Consider caching intermediate results');
      optimizations.performance.push('Implement result pagination for large outputs');
    }

    // Reliability optimizations
    optimizations.reliability.push('Add comprehensive error handling');
    optimizations.reliability.push('Implement health checks for all services');
    optimizations.reliability.push('Add retry logic for external dependencies');

    // Scalability optimizations
    if (context.requirements.some(req => req.includes('concurrent') || req.includes('parallel'))) {
      optimizations.scalability.push('Design for horizontal scaling');
      optimizations.scalability.push('Implement load balancing');
    }

    // Cost optimizations
    optimizations.cost.push('Use resource-efficient base images');
    optimizations.cost.push('Implement auto-scaling policies');
    optimizations.cost.push('Consider serverless deployment for intermittent workloads');

    return optimizations;
  }

  /**
   * Build context analysis prompt
   */
  private buildContextAnalysisPrompt(context: OrchestrationContext): string {
    return `
Analyze this orchestration context and provide a detailed assessment:

TASK DETAILS:
- ID: ${context.taskId}
- Type: ${context.taskType}
- Timeline: ${context.timeline}

REQUIREMENTS:
${context.requirements.map(req => `- ${req}`).join('\n')}

CONSTRAINTS:
${context.constraints.map(con => `- ${con}`).join('\n')}

EXPECTED OUTPUTS:
${context.expectedOutputs.map(out => `- ${out}`).join('\n')}

DEPENDENCIES:
${context.dependencies.map(dep => `- ${dep}`).join('\n')}

Provide analysis on:
1. Complexity Assessment (low/medium/high)
2. Recommended Tools (specific tool names)
3. Resource Estimates (CPU, memory, storage, duration)
4. Risk Factors (potential issues)
5. Optimization Opportunities
6. Dependency Analysis (required, optional, conflicts)

Be specific and actionable in your recommendations.
`;
  }

  /**
   * Build task decomposition prompt
   */
  private buildDecompositionPrompt(context: OrchestrationContext): string {
    return `
Decompose this task into manageable phases:

TASK: ${context.taskId} (${context.taskType})
REQUIREMENTS: ${context.requirements.join(', ')}
TIMELINE: ${context.timeline}

Break down into phases with:
1. Phase name and description
2. Estimated duration
3. Dependencies on other phases
4. Required tools
5. Risk factors

Also identify:
- Critical path (phases that block others)
- Parallelizable work
- Potential bottlenecks

Focus on practical, implementable phases.
`;
  }

  /**
   * Parse AI analysis response
   */
  private async parseAnalysisResponse(response: string, context: OrchestrationContext): Promise<ContextAnalysisResult> {
    // Simple parsing for now - in production would use more sophisticated NLP
    const complexity = this.extractComplexity(response, context);
    const tools = this.extractTools(response, context);
    const risks = this.extractRisks(response);
    
    return {
      complexity,
      recommendedTools: tools,
      resourceEstimate: this.calculateResourceEstimate(complexity, tools.length),
      riskFactors: risks,
      optimizations: this.extractOptimizations(response),
      dependencies: this.extractDependencies(response, context)
    };
  }

  /**
   * Parse task decomposition response
   */
  private async parseDecompositionResponse(response: string, context: OrchestrationContext): Promise<TaskDecomposition> {
    // Parse phases from response
    const phases = this.extractPhases(response, context);
    
    return {
      phases,
      criticalPath: this.identifyCriticalPath(phases),
      parallelizable: this.identifyParallelizable(phases),
      bottlenecks: this.identifyBottlenecks(phases)
    };
  }

  /**
   * Utility methods for parsing and analysis
   */
  private extractComplexity(response: string, context: OrchestrationContext): 'low' | 'medium' | 'high' {
    const lowIndicators = ['simple', 'basic', 'straightforward', 'minimal'];
    const highIndicators = ['complex', 'advanced', 'sophisticated', 'multiple systems'];
    
    const lowerResponse = response.toLowerCase();
    
    if (highIndicators.some(indicator => lowerResponse.includes(indicator))) {
      return 'high';
    }
    
    if (lowIndicators.some(indicator => lowerResponse.includes(indicator))) {
      return 'low';
    }
    
    // Default based on context
    if (context.requirements.length > 8 || context.dependencies.length > 5) {
      return 'high';
    } else if (context.requirements.length > 4 || context.dependencies.length > 2) {
      return 'medium';
    }
    
    return 'low';
  }

  private extractTools(response: string, context: OrchestrationContext): string[] {
    const commonTools = {
      data_processing: ['data_validator', 'data_transformer', 'data_exporter'],
      api_integration: ['api_client', 'auth_handler', 'response_mapper'],
      workflow_automation: ['workflow_engine', 'task_scheduler', 'notification_sender'],
      ml_pipeline: ['data_preprocessor', 'model_trainer', 'inference_engine'],
      custom: ['custom_processor', 'custom_api', 'custom_service']
    };
    
    return commonTools[context.taskType] || commonTools.custom;
  }

  private extractRisks(response: string): string[] {
    const risks = [];
    const riskKeywords = ['risk', 'concern', 'issue', 'problem', 'challenge'];
    
    for (const keyword of riskKeywords) {
      if (response.toLowerCase().includes(keyword)) {
        risks.push(`Potential ${keyword} identified in requirements`);
      }
    }
    
    return risks.length > 0 ? risks : ['No major risks identified'];
  }

  private extractOptimizations(response: string): string[] {
    return [
      'Implement caching for frequently accessed data',
      'Use connection pooling for database operations',
      'Add comprehensive logging and monitoring'
    ];
  }

  private extractDependencies(response: string, context: OrchestrationContext): {
    required: string[];
    optional: string[];
    conflicts: string[];
  } {
    return {
      required: context.dependencies.filter(dep => !dep.includes('optional')),
      optional: context.dependencies.filter(dep => dep.includes('optional')),
      conflicts: []
    };
  }

  private extractPhases(response: string, context: OrchestrationContext): Array<{
    name: string;
    description: string;
    estimatedDuration: string;
    dependencies: string[];
    tools: string[];
    risks: string[];
  }> {
    // Basic phase extraction based on task type
    const basePhases = {
      data_processing: [
        { name: 'Data Ingestion', description: 'Read and validate input data', estimatedDuration: '15 min' },
        { name: 'Data Processing', description: 'Transform and clean data', estimatedDuration: '20 min' },
        { name: 'Data Export', description: 'Output processed data', estimatedDuration: '10 min' }
      ],
      api_integration: [
        { name: 'Authentication Setup', description: 'Configure API authentication', estimatedDuration: '10 min' },
        { name: 'API Integration', description: 'Implement API calls', estimatedDuration: '20 min' },
        { name: 'Response Processing', description: 'Handle API responses', estimatedDuration: '15 min' }
      ]
    };
    
    const phases = basePhases[context.taskType as keyof typeof basePhases] || [
      { name: 'Analysis', description: 'Analyze requirements', estimatedDuration: '15 min' },
      { name: 'Implementation', description: 'Build solution', estimatedDuration: '30 min' },
      { name: 'Testing', description: 'Test and validate', estimatedDuration: '15 min' }
    ];
    
    return phases.map(phase => ({
      ...phase,
      dependencies: [],
      tools: [],
      risks: []
    }));
  }

  private identifyCriticalPath(phases: any[]): string[] {
    return phases.map(phase => phase.name);
  }

  private identifyParallelizable(phases: any[]): string[] {
    return [];
  }

  private identifyBottlenecks(phases: any[]): string[] {
    return phases.filter(phase => phase.estimatedDuration.includes('30')).map(phase => phase.name);
  }

  private calculateResourceEstimate(complexity: string, toolCount: number): {
    cpu: string;
    memory: string;
    storage: string;
    estimatedDuration: string;
  } {
    const baseResources = {
      low: { cpu: '500m', memory: '512Mi', storage: '1Gi', duration: 30 },
      medium: { cpu: '1000m', memory: '1Gi', storage: '2Gi', duration: 60 },
      high: { cpu: '2000m', memory: '2Gi', storage: '4Gi', duration: 120 }
    };
    
    const base = baseResources[complexity as keyof typeof baseResources];
    const multiplier = Math.max(1, toolCount / 3);
    
    return {
      cpu: base.cpu,
      memory: base.memory,
      storage: base.storage,
      estimatedDuration: `${Math.ceil(base.duration * multiplier)} minutes`
    };
  }

  private parseToolRequirements(response: string): {
    coreTools: string[];
    supportingTools: string[];
    integrationTools: string[];
    monitoringTools: string[];
  } {
    return {
      coreTools: ['data_processor', 'business_logic'],
      supportingTools: ['validator', 'formatter'],
      integrationTools: ['api_client', 'database_connector'],
      monitoringTools: ['health_checker', 'metrics_collector']
    };
  }

  private createFallbackAnalysis(context: OrchestrationContext): ContextAnalysisResult {
    return {
      complexity: context.complexity || 'medium',
      recommendedTools: ['processor', 'validator', 'exporter'],
      resourceEstimate: {
        cpu: '1000m',
        memory: '1Gi',
        storage: '2Gi',
        estimatedDuration: '60 minutes'
      },
      riskFactors: ['Unknown complexity due to analysis failure'],
      optimizations: ['Add detailed requirements for better analysis'],
      dependencies: {
        required: context.dependencies,
        optional: [],
        conflicts: []
      }
    };
  }

  private createFallbackDecomposition(context: OrchestrationContext): TaskDecomposition {
    return {
      phases: [
        {
          name: 'Preparation',
          description: 'Prepare environment and dependencies',
          estimatedDuration: '15 minutes',
          dependencies: [],
          tools: [],
          risks: []
        },
        {
          name: 'Implementation',
          description: 'Implement core functionality',
          estimatedDuration: '30 minutes',
          dependencies: ['Preparation'],
          tools: [],
          risks: []
        },
        {
          name: 'Validation',
          description: 'Test and validate implementation',
          estimatedDuration: '15 minutes',
          dependencies: ['Implementation'],
          tools: [],
          risks: []
        }
      ],
      criticalPath: ['Preparation', 'Implementation', 'Validation'],
      parallelizable: [],
      bottlenecks: ['Implementation']
    };
  }

  private createFallbackToolRequirements(context: OrchestrationContext): {
    coreTools: string[];
    supportingTools: string[];
    integrationTools: string[];
    monitoringTools: string[];
  } {
    return {
      coreTools: ['main_processor'],
      supportingTools: ['helper_utility'],
      integrationTools: ['connector'],
      monitoringTools: ['health_check']
    };
  }
}

// Singleton instance
export const orchestrationContextAnalyzer = new OrchestrationContextAnalyzer();