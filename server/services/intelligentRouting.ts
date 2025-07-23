/**
 * Intelligent Routing Service
 * Implements context-aware routing and adaptive AI model selection
 * Based on Project Chimera routing principles, adapted for Synapse AI
 */

import { 
  ModelSelectionRule, 
  AgentBehaviorRule, 
  ContextualRoutingRule,
  AdvancedAIConfig,
  defaultModelSelectionRules,
  defaultAgentBehaviorRules,
  defaultContextualRoutingRules,
  defaultAdvancedConfig
} from '../config/aiRules';

interface RoutingContext {
  userMessage: string;
  activeFile?: string;
  fileType?: string;
  openFiles?: string[];
  projectType?: string;
  userRole?: string;
  sessionHistory?: string[];
  complexity?: 'low' | 'medium' | 'high';
  urgency?: 'low' | 'medium' | 'high';
}

interface RoutingDecision {
  selectedAgent: string;
  selectedProvider: string;
  selectedModel: string;
  enhancedPrompt: string;
  confidence: number;
  reasoning: string[];
  fallbackOptions: Array<{
    agent: string;
    provider: string;
    model: string;
  }>;
}

export class IntelligentRoutingService {
  private modelRules: ModelSelectionRule[];
  private agentRules: AgentBehaviorRule[];
  private routingRules: ContextualRoutingRule[];
  private config: AdvancedAIConfig;
  private performanceMetrics: Map<string, any> = new Map();
  private learningData: Map<string, any> = new Map();

  constructor() {
    this.modelRules = [...defaultModelSelectionRules];
    this.agentRules = [...defaultAgentBehaviorRules];
    this.routingRules = [...defaultContextualRoutingRules];
    this.config = { ...defaultAdvancedConfig };
    this.initializePerformanceTracking();
  }

  /**
   * Main routing decision method
   */
  async routeRequest(context: RoutingContext): Promise<RoutingDecision> {
    console.log('[IntelligentRouting] Processing routing request:', {
      message: context.userMessage.substring(0, 100),
      activeFile: context.activeFile,
      fileType: context.fileType
    });

    // Step 1: Analyze context and determine task type
    const taskAnalysis = this.analyzeTask(context);
    
    // Step 2: Select best agent based on context
    const agentDecision = this.selectAgent(context, taskAnalysis);
    
    // Step 3: Select optimal provider and model
    const providerDecision = this.selectProviderAndModel(context, taskAnalysis, agentDecision);
    
    // Step 4: Enhance prompt with context
    const enhancedPrompt = this.enhancePrompt(context, agentDecision, taskAnalysis);
    
    // Step 5: Calculate confidence and generate fallbacks
    const confidence = this.calculateConfidence(agentDecision, providerDecision, taskAnalysis);
    const fallbackOptions = this.generateFallbackOptions(context, taskAnalysis);

    const decision: RoutingDecision = {
      selectedAgent: agentDecision.agent,
      selectedProvider: providerDecision.provider,
      selectedModel: providerDecision.model,
      enhancedPrompt,
      confidence,
      reasoning: [
        ...agentDecision.reasoning,
        ...providerDecision.reasoning,
        `Task complexity: ${taskAnalysis.complexity}`,
        `Context relevance: ${taskAnalysis.contextRelevance}`
      ],
      fallbackOptions
    };

    // Step 6: Track decision for learning
    if (this.config.adaptiveLearning.enabled) {
      this.trackDecision(context, decision);
    }

    console.log('[IntelligentRouting] Routing decision:', {
      agent: decision.selectedAgent,
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      confidence: decision.confidence
    });

    return decision;
  }

  /**
   * Analyze the user's task to determine type and complexity
   */
  private analyzeTask(context: RoutingContext): any {
    const message = context.userMessage.toLowerCase();
    const keywords = this.extractKeywords(message);
    
    // Determine task type based on keywords and context
    let taskType = 'general-help';
    let complexity = 'medium';
    let contextRelevance = 0.5;

    // Code-related tasks
    if (keywords.some(kw => ['code', 'function', 'class', 'debug', 'compile', 'syntax'].includes(kw)) ||
        context.fileType && ['.js', '.ts', '.py', '.java', '.cpp'].includes(context.fileType)) {
      taskType = 'code-generation';
      complexity = keywords.some(kw => ['complex', 'architecture', 'design', 'system'].includes(kw)) ? 'high' : 'medium';
      contextRelevance = context.activeFile ? 0.9 : 0.7;
    }

    // Analysis and optimization tasks
    else if (keywords.some(kw => ['optimize', 'improve', 'performance', 'analyze', 'review'].includes(kw))) {
      taskType = 'optimization';
      complexity = 'high';
      contextRelevance = 0.8;
    }

    // Planning and architecture tasks
    else if (keywords.some(kw => ['plan', 'architecture', 'design', 'strategy', 'roadmap'].includes(kw))) {
      taskType = 'planning';
      complexity = 'high';
      contextRelevance = 0.7;
    }

    // Creative tasks
    else if (keywords.some(kw => ['create', 'write', 'generate', 'content', 'story'].includes(kw))) {
      taskType = 'creative-writing';
      complexity = 'medium';
      contextRelevance = 0.6;
    }

    return {
      taskType,
      complexity,
      contextRelevance,
      keywords,
      estimatedTokens: this.estimateTokenRequirement(message, taskType),
      responseTimePreference: this.inferResponseTimePreference(context, taskType)
    };
  }

  /**
   * Select the best agent for the task
   */
  private selectAgent(context: RoutingContext, taskAnalysis: any): any {
    let bestAgent = 'maestro'; // Default fallback
    let bestScore = 0;
    let reasoning: string[] = [];

    // Check contextual routing rules first
    for (const rule of this.routingRules) {
      if (this.matchesRoutingRule(rule, context, taskAnalysis)) {
        const agent = this.agentRules.find(a => a.agentId === rule.routing.preferredAgent);
        if (agent && this.hasRequiredCapabilities(agent, rule.routing.requiredCapabilities)) {
          bestAgent = agent.agentId;
          reasoning.push(`Matched contextual rule: ${rule.id}`);
          bestScore = 0.9;
          break;
        }
      }
    }

    // If no contextual rule matched, use capability-based selection
    if (bestScore === 0) {
      for (const agent of this.agentRules) {
        const score = this.calculateAgentScore(agent, taskAnalysis);
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent.agentId;
          reasoning = [`Best capability match for ${taskAnalysis.taskType}`, `Score: ${score.toFixed(2)}`];
        }
      }
    }

    return {
      agent: bestAgent,
      score: bestScore,
      reasoning
    };
  }

  /**
   * Select optimal provider and model based on task requirements
   */
  private selectProviderAndModel(context: RoutingContext, taskAnalysis: any, agentDecision: any): any {
    let bestProvider = 'deepseek'; // Current working provider
    let bestModel = 'deepseek-chat';
    let reasoning: string[] = [];

    // Find applicable model selection rules
    const applicableRules = this.modelRules
      .filter(rule => this.matchesModelRule(rule, taskAnalysis))
      .sort((a, b) => b.priority - a.priority);

    if (applicableRules.length > 0) {
      const rule = applicableRules[0];
      reasoning.push(`Applied rule: ${rule.name}`);

      // Select best available provider from rule's preferences
      for (const provider of rule.preferredProviders) {
        if (this.isProviderAvailable(provider)) {
          bestProvider = provider;
          bestModel = rule.preferredModels[provider] || this.getDefaultModelForProvider(provider);
          reasoning.push(`Selected ${provider} with model ${bestModel}`);
          break;
        }
      }
    }

    // Apply agent-specific preferences
    const agent = this.agentRules.find(a => a.agentId === agentDecision.agent);
    if (agent && agent.specializations.preferredProviders.includes(bestProvider)) {
      reasoning.push(`Agent ${agent.name} prefers ${bestProvider}`);
    }

    return {
      provider: bestProvider,
      model: bestModel,
      reasoning
    };
  }

  /**
   * Enhance the prompt with relevant context and instructions
   */
  private enhancePrompt(context: RoutingContext, agentDecision: any, taskAnalysis: any): string {
    let enhancedPrompt = context.userMessage;
    const agent = this.agentRules.find(a => a.agentId === agentDecision.agent);

    // Add agent-specific system prompt
    if (agent) {
      const systemPrompt = agent.specializations.systemPrompts[taskAnalysis.taskType] ||
                          agent.specializations.systemPrompts.default;
      if (systemPrompt) {
        enhancedPrompt = `${systemPrompt}\n\nUser Request: ${enhancedPrompt}`;
      }
    }

    // Add file context if available
    if (context.activeFile) {
      enhancedPrompt += `\n\nContext: Currently working on file ${context.activeFile}`;
      if (context.fileType) {
        enhancedPrompt += ` (${context.fileType} file)`;
      }
    }

    // Add project context
    if (context.openFiles && context.openFiles.length > 0) {
      enhancedPrompt += `\n\nOpen files in workspace: ${context.openFiles.join(', ')}`;
    }

    // Add complexity guidance
    if (taskAnalysis.complexity === 'high') {
      enhancedPrompt += '\n\nNote: This appears to be a complex task. Please provide detailed, thorough analysis and consider multiple approaches.';
    } else if (taskAnalysis.complexity === 'low') {
      enhancedPrompt += '\n\nNote: Please provide a concise, direct response.';
    }

    return enhancedPrompt;
  }

  /**
   * Calculate confidence score for the routing decision
   */
  private calculateConfidence(agentDecision: any, providerDecision: any, taskAnalysis: any): number {
    let confidence = 0.5; // Base confidence

    // Agent selection confidence
    confidence += agentDecision.score * 0.3;

    // Provider availability confidence
    if (this.isProviderAvailable(providerDecision.provider)) {
      confidence += 0.2;
    }

    // Context relevance confidence
    confidence += taskAnalysis.contextRelevance * 0.2;

    // Historical performance confidence
    const historicalScore = this.getHistoricalPerformance(agentDecision.agent, providerDecision.provider);
    confidence += historicalScore * 0.3;

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  /**
   * Generate fallback options for the routing decision
   */
  private generateFallbackOptions(context: RoutingContext, taskAnalysis: any): Array<{agent: string, provider: string, model: string}> {
    const fallbacks: Array<{agent: string, provider: string, model: string}> = [];

    // Add general fallback options
    const availableProviders = ['deepseek', 'openai', 'anthropic'].filter(p => this.isProviderAvailable(p));
    const generalAgents = ['maestro', 'ai-integration'];

    for (const agent of generalAgents) {
      for (const provider of availableProviders) {
        if (fallbacks.length < 3) {
          fallbacks.push({
            agent,
            provider,
            model: this.getDefaultModelForProvider(provider)
          });
        }
      }
    }

    return fallbacks;
  }

  // Utility methods
  private extractKeywords(text: string): string[] {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 10); // Limit to first 10 keywords
  }

  private matchesRoutingRule(rule: ContextualRoutingRule, context: RoutingContext, taskAnalysis: any): boolean {
    if (rule.trigger.keywords && !rule.trigger.keywords.some(kw => taskAnalysis.keywords.includes(kw))) {
      return false;
    }
    if (rule.trigger.fileTypes && context.fileType && !rule.trigger.fileTypes.includes(context.fileType)) {
      return false;
    }
    return true;
  }

  private hasRequiredCapabilities(agent: AgentBehaviorRule, requiredCapabilities: string[]): boolean {
    return requiredCapabilities.every(cap => agent.capabilities.includes(cap));
  }

  private calculateAgentScore(agent: AgentBehaviorRule, taskAnalysis: any): number {
    let score = 0;

    // Check if agent specializes in this task type
    if (agent.specializations.taskTypes.includes(taskAnalysis.taskType)) {
      score += 0.5;
    }

    // Check capability alignment
    const relevantCapabilities = this.getRelevantCapabilities(taskAnalysis.taskType);
    const capabilityMatch = relevantCapabilities.filter(cap => agent.capabilities.includes(cap)).length / relevantCapabilities.length;
    score += capabilityMatch * 0.3;

    // Add historical performance
    const historicalPerformance = this.getHistoricalAgentPerformance(agent.agentId);
    score += historicalPerformance * 0.2;

    return score;
  }

  private matchesModelRule(rule: ModelSelectionRule, taskAnalysis: any): boolean {
    if (rule.conditions.taskType && !rule.conditions.taskType.includes(taskAnalysis.taskType)) {
      return false;
    }
    if (rule.conditions.complexityLevel && rule.conditions.complexityLevel !== taskAnalysis.complexity) {
      return false;
    }
    if (rule.conditions.responseTimeRequirement && rule.conditions.responseTimeRequirement !== taskAnalysis.responseTimePreference) {
      return false;
    }
    return true;
  }

  private isProviderAvailable(provider: string): boolean {
    // For now, assume DeepSeek is always available since it's working
    // This should be connected to the actual provider status from AIIntegrationService
    return provider === 'deepseek';
  }

  private getDefaultModelForProvider(provider: string): string {
    const defaults: Record<string, string> = {
      'deepseek': 'deepseek-chat',
      'openai': 'gpt-4o',
      'anthropic': 'claude-sonnet-4-20250514',
      'google': 'gemini-2.5-flash'
    };
    return defaults[provider] || 'deepseek-chat';
  }

  private getRelevantCapabilities(taskType: string): string[] {
    const capabilities: Record<string, string[]> = {
      'code-generation': ['code-generation', 'debugging'],
      'optimization': ['performance-analysis', 'optimization'],
      'planning': ['project-planning', 'architecture'],
      'general-help': ['general-help', 'coordination']
    };
    return capabilities[taskType] || ['general-help'];
  }

  private estimateTokenRequirement(message: string, taskType: string): number {
    const baseTokens = Math.ceil(message.length / 4); // Rough estimate: 4 chars per token
    const multipliers: Record<string, number> = {
      'code-generation': 3,
      'optimization': 4,
      'planning': 2.5,
      'general-help': 1.5
    };
    return baseTokens * (multipliers[taskType] || 2);
  }

  private inferResponseTimePreference(context: RoutingContext, taskType: string): 'fast' | 'balanced' | 'quality' {
    if (context.urgency === 'high') return 'fast';
    if (taskType === 'planning' || taskType === 'optimization') return 'quality';
    return 'balanced';
  }

  private initializePerformanceTracking(): void {
    // Initialize performance tracking data structures
    this.performanceMetrics.set('agents', new Map());
    this.performanceMetrics.set('providers', new Map());
    this.performanceMetrics.set('routing_decisions', []);
  }

  private trackDecision(context: RoutingContext, decision: RoutingDecision): void {
    const timestamp = new Date().toISOString();
    const trackingData = {
      timestamp,
      context: {
        messageLength: context.userMessage.length,
        hasActiveFile: !!context.activeFile,
        fileType: context.fileType,
        numOpenFiles: context.openFiles?.length || 0
      },
      decision: {
        agent: decision.selectedAgent,
        provider: decision.selectedProvider,
        model: decision.selectedModel,
        confidence: decision.confidence
      }
    };

    const decisions = this.performanceMetrics.get('routing_decisions') || [];
    decisions.push(trackingData);
    
    // Keep only last 1000 decisions for memory efficiency
    if (decisions.length > 1000) {
      decisions.shift();
    }
    
    this.performanceMetrics.set('routing_decisions', decisions);
  }

  private getHistoricalPerformance(agent: string, provider: string): number {
    // Placeholder for historical performance lookup
    // This would connect to actual performance metrics from the system
    return 0.7; // Default performance score
  }

  private getHistoricalAgentPerformance(agentId: string): number {
    // Placeholder for agent-specific historical performance
    return 0.75; // Default performance score
  }

  // Public methods for configuration management
  public updateModelRules(rules: ModelSelectionRule[]): void {
    this.modelRules = [...rules];
    console.log('[IntelligentRouting] Updated model selection rules');
  }

  public updateAgentRules(rules: AgentBehaviorRule[]): void {
    this.agentRules = [...rules];
    console.log('[IntelligentRouting] Updated agent behavior rules');
  }

  public updateRoutingRules(rules: ContextualRoutingRule[]): void {
    this.routingRules = [...rules];
    console.log('[IntelligentRouting] Updated contextual routing rules');
  }

  public updateConfiguration(config: Partial<AdvancedAIConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[IntelligentRouting] Updated advanced configuration');
  }

  public getPerformanceMetrics(): any {
    return {
      totalDecisions: this.performanceMetrics.get('routing_decisions')?.length || 0,
      recentDecisions: this.performanceMetrics.get('routing_decisions')?.slice(-10) || [],
      agentPerformance: this.performanceMetrics.get('agents'),
      providerPerformance: this.performanceMetrics.get('providers')
    };
  }
}

export const intelligentRoutingService = new IntelligentRoutingService();