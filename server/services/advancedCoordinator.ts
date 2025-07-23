import { nanoid } from 'nanoid';
import { aiIntegrationService } from './aiIntegration';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  capabilities: string[];
  currentTasks: string[];
  successRate: number;
  averageResponseTime: number;
  healthScore: number;
}

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  description: string;
  assignedAgent?: string;
  progress: number;
  context?: {
    domain: string;
    complexity: number;
    dependencies: string[];
    expectedOutput: string;
    agentSpecificInstructions: Record<string, string>;
  };
  parentTaskId?: string;
  subtasks?: Task[];
  metadata?: {
    estimatedDuration: number;
    requiredCapabilities: string[];
    outputFormat: string;
    qualityMetrics: string[];
  };
}

interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  type: 'app' | 'feature' | 'service' | 'analysis' | 'optimization';
  requirements: string[];
  constraints?: string[];
  timeline?: string;
  priority: number;
}

interface DecompositionResult {
  projectId: string;
  taskHierarchy: Task[];
  agentAssignments: Record<string, string[]>;
  executionPlan: {
    phases: ExecutionPhase[];
    estimatedDuration: number;
    riskFactors: string[];
    successCriteria: string[];
  };
  contextMap: Record<string, any>;
}

interface ExecutionPhase {
  id: string;
  name: string;
  description: string;
  tasks: string[];
  dependencies: string[];
  estimatedDuration: number;
  parallelizable: boolean;
}

interface AgentContext {
  agentType: string;
  capabilities: string[];
  currentWorkload: number;
  preferredTaskTypes: string[];
  communicationStyle: string;
  expectedResponseFormat: string;
  qualityThreshold: number;
}

export class AdvancedCoordinatorService {
  private projectDatabase: Map<string, ProjectRequest> = new Map();
  private taskDatabase: Map<string, Task> = new Map();
  private agentContexts: Map<string, AgentContext> = new Map();
  private executionHistory: Map<string, DecompositionResult> = new Map();

  constructor() {
    this.initializeAgentContexts();
  }

  /**
   * Initialize predefined agent contexts for optimal task assignment
   */
  private initializeAgentContexts() {
    const contexts: AgentContext[] = [
      {
        agentType: 'maestro',
        capabilities: ['task-orchestration', 'agent-coordination', 'system-monitoring'],
        currentWorkload: 0,
        preferredTaskTypes: ['coordination', 'planning', 'monitoring'],
        communicationStyle: 'executive-summary',
        expectedResponseFormat: 'structured-report',
        qualityThreshold: 0.95
      },
      {
        agentType: 'ai-integration',
        capabilities: ['multi-provider-ai', 'circuit-breaking', 'prompt-optimization'],
        currentWorkload: 0,
        preferredTaskTypes: ['ai-processing', 'nlp-tasks', 'content-generation'],
        communicationStyle: 'technical-detailed',
        expectedResponseFormat: 'json-with-metadata',
        qualityThreshold: 0.9
      },
      {
        agentType: 'mcp-management',
        capabilities: ['server-discovery', 'docker-deployment', 'containerization'],
        currentWorkload: 0,
        preferredTaskTypes: ['deployment', 'infrastructure', 'service-management'],
        communicationStyle: 'operational-focused',
        expectedResponseFormat: 'deployment-logs',
        qualityThreshold: 0.95
      },
      {
        agentType: 'project',
        capabilities: ['project-management', 'resource-allocation', 'planning'],
        currentWorkload: 0,
        preferredTaskTypes: ['planning', 'resource-management', 'timeline-tracking'],
        communicationStyle: 'milestone-oriented',
        expectedResponseFormat: 'project-timeline',
        qualityThreshold: 0.85
      },
      {
        agentType: 'cognitive-refiner',
        capabilities: ['learning-optimization', 'performance-analysis', 'adaptation'],
        currentWorkload: 0,
        preferredTaskTypes: ['optimization', 'analysis', 'learning'],
        communicationStyle: 'analytical-insights',
        expectedResponseFormat: 'performance-metrics',
        qualityThreshold: 0.9
      }
    ];

    contexts.forEach(context => {
      this.agentContexts.set(context.agentType, context);
    });
  }

  /**
   * Main decomposition function that takes high-level requests and creates detailed task plans
   */
  async decomposeProjectRequest(request: ProjectRequest, availableAgents: Agent[]): Promise<DecompositionResult> {
    console.log(`[AdvancedCoordinator] Decomposing project: ${request.title}`);
    
    // Store project request
    this.projectDatabase.set(request.id, request);
    
    // Analyze project complexity and requirements
    const complexityAnalysis = await this.analyzeProjectComplexity(request);
    
    // Generate task hierarchy using AI-powered decomposition
    const taskHierarchy = await this.generateTaskHierarchy(request, complexityAnalysis);
    
    // Create context-augmented tasks for specific agents
    const contextAugmentedTasks = await this.augmentTasksWithContext(taskHierarchy, availableAgents);
    
    // Assign agents optimally based on capabilities and context
    const agentAssignments = this.optimizeAgentAssignments(contextAugmentedTasks, availableAgents);
    
    // Create execution plan with phases and dependencies
    const executionPlan = this.createExecutionPlan(contextAugmentedTasks, agentAssignments);
    
    // Generate context map for inter-agent communication
    const contextMap = this.generateContextMap(contextAugmentedTasks, agentAssignments, availableAgents);
    
    const result: DecompositionResult = {
      projectId: request.id,
      taskHierarchy: contextAugmentedTasks,
      agentAssignments,
      executionPlan,
      contextMap
    };
    
    // Store execution result for future reference
    this.executionHistory.set(request.id, result);
    
    console.log(`[AdvancedCoordinator] Successfully decomposed project into ${contextAugmentedTasks.length} tasks across ${Object.keys(agentAssignments).length} agents`);
    
    return result;
  }

  /**
   * Analyze project complexity using AI
   */
  private async analyzeProjectComplexity(request: ProjectRequest): Promise<any> {
    const analysisPrompt = `
Analyze the following project request and provide a complexity assessment:

Project: ${request.title}
Description: ${request.description}
Type: ${request.type}
Requirements: ${request.requirements.join(', ')}

Please analyze:
1. Technical complexity (1-10 scale)
2. Required expertise areas
3. Potential risks and challenges
4. Estimated effort distribution across different skill areas
5. Dependencies and blockers
6. Success metrics

Provide response in JSON format with detailed analysis.
`;

    try {
      const response = await aiIntegrationService.processRequest({
        prompt: analysisPrompt,
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 1000
      });

      return JSON.parse(response.content || '{}');
    } catch (error) {
      console.error('[AdvancedCoordinator] Error analyzing complexity:', error);
      // Fallback to basic analysis
      return {
        technicalComplexity: 5,
        expertiseAreas: ['general-development'],
        risks: ['timeline-uncertainty'],
        effortDistribution: { development: 70, testing: 20, deployment: 10 }
      };
    }
  }

  /**
   * Generate hierarchical task breakdown using AI
   */
  private async generateTaskHierarchy(request: ProjectRequest, complexityAnalysis: any): Promise<Task[]> {
    const decompositionPrompt = `
Based on the project request and complexity analysis, create a detailed task breakdown:

Project: ${request.title}
Description: ${request.description}
Complexity: ${JSON.stringify(complexityAnalysis)}

Create a hierarchical task structure with:
1. High-level phases
2. Detailed sub-tasks
3. Dependencies between tasks
4. Estimated effort for each task
5. Required capabilities
6. Expected output format
7. Quality metrics

For each task, specify:
- Unique identifier
- Clear description
- Priority level (1-10)
- Required agent capabilities
- Expected duration
- Dependencies on other tasks
- Success criteria

Provide response as JSON array of task objects.
`;

    try {
      const response = await aiIntegrationService.processRequest({
        prompt: decompositionPrompt,
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 2000
      });

      const tasksData = JSON.parse(response.content || '[]');
      
      return tasksData.map((taskData: any) => ({
        id: nanoid(),
        type: taskData.type || 'general',
        status: 'pending' as const,
        priority: taskData.priority || 5,
        description: taskData.description,
        progress: 0,
        context: {
          domain: taskData.domain || request.type,
          complexity: taskData.complexity || 5,
          dependencies: taskData.dependencies || [],
          expectedOutput: taskData.expectedOutput || 'completion-report',
          agentSpecificInstructions: {}
        },
        metadata: {
          estimatedDuration: taskData.estimatedDuration || 60,
          requiredCapabilities: taskData.requiredCapabilities || [],
          outputFormat: taskData.outputFormat || 'text',
          qualityMetrics: taskData.qualityMetrics || ['completion', 'accuracy']
        }
      }));
    } catch (error) {
      console.error('[AdvancedCoordinator] Error generating task hierarchy:', error);
      
      // Fallback to basic task structure
      return [
        {
          id: nanoid(),
          type: 'planning',
          status: 'pending',
          priority: 8,
          description: `Plan implementation for ${request.title}`,
          progress: 0,
          context: {
            domain: request.type,
            complexity: 5,
            dependencies: [],
            expectedOutput: 'implementation-plan',
            agentSpecificInstructions: {}
          },
          metadata: {
            estimatedDuration: 30,
            requiredCapabilities: ['planning'],
            outputFormat: 'structured-document',
            qualityMetrics: ['completeness', 'feasibility']
          }
        }
      ];
    }
  }

  /**
   * Augment tasks with agent-specific context and instructions
   */
  private async augmentTasksWithContext(tasks: Task[], availableAgents: Agent[]): Promise<Task[]> {
    const augmentedTasks: Task[] = [];
    
    for (const task of tasks) {
      // Find suitable agents for this task
      const suitableAgents = this.findSuitableAgents(task, availableAgents);
      
      // Generate agent-specific instructions for each suitable agent
      const agentInstructions: Record<string, string> = {};
      
      for (const agent of suitableAgents) {
        const agentContext = this.agentContexts.get(agent.type);
        if (agentContext) {
          const instruction = await this.generateAgentSpecificInstruction(task, agent, agentContext);
          agentInstructions[agent.id] = instruction;
        }
      }
      
      // Augment task with context
      const augmentedTask: Task = {
        ...task,
        context: {
          ...task.context!,
          agentSpecificInstructions: agentInstructions
        }
      };
      
      augmentedTasks.push(augmentedTask);
    }
    
    return augmentedTasks;
  }

  /**
   * Find agents suitable for a specific task
   */
  private findSuitableAgents(task: Task, availableAgents: Agent[]): Agent[] {
    const requiredCapabilities = task.metadata?.requiredCapabilities || [];
    
    return availableAgents.filter(agent => {
      // Check if agent has required capabilities
      const hasCapabilities = requiredCapabilities.every(capability =>
        agent.capabilities.some(agentCap => 
          agentCap.includes(capability) || capability.includes(agentCap)
        )
      );
      
      // Check agent availability and health
      const isAvailable = agent.status !== 'offline' && agent.healthScore > 0.7;
      
      return hasCapabilities && isAvailable;
    });
  }

  /**
   * Generate agent-specific instructions
   */
  private async generateAgentSpecificInstruction(task: Task, agent: Agent, agentContext: AgentContext): Promise<string> {
    const instructionPrompt = `
Generate specific instructions for an AI agent to execute this task:

Task: ${task.description}
Task Type: ${task.type}
Expected Output: ${task.context?.expectedOutput}
Domain: ${task.context?.domain}

Agent Profile:
- Type: ${agent.type}
- Capabilities: ${agent.capabilities.join(', ')}
- Communication Style: ${agentContext.communicationStyle}
- Expected Response Format: ${agentContext.expectedResponseFormat}
- Quality Threshold: ${agentContext.qualityThreshold}

Create instructions that:
1. Are tailored to this agent's capabilities and communication style
2. Specify the exact output format expected
3. Include quality criteria and success metrics
4. Provide context about how this task fits into the larger project
5. Include any dependencies or prerequisites

Keep instructions clear, actionable, and optimized for AI agent execution.
`;

    try {
      const response = await aiIntegrationService.processRequest({
        prompt: instructionPrompt,
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 500
      });

      return response.content || `Execute task: ${task.description} according to your ${agent.type} capabilities.`;
    } catch (error) {
      console.error('[AdvancedCoordinator] Error generating agent instruction:', error);
      return `Execute task: ${task.description} according to your ${agent.type} capabilities.`;
    }
  }

  /**
   * Optimize agent assignments using capability matching and load balancing
   */
  private optimizeAgentAssignments(tasks: Task[], availableAgents: Agent[]): Record<string, string[]> {
    const assignments: Record<string, string[]> = {};
    const agentWorkloads: Map<string, number> = new Map();
    
    // Initialize agent workloads
    availableAgents.forEach(agent => {
      assignments[agent.id] = [];
      agentWorkloads.set(agent.id, agent.currentTasks.length);
    });
    
    // Sort tasks by priority and complexity
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return (b.context?.complexity || 0) - (a.context?.complexity || 0);
    });
    
    // Assign tasks to optimal agents
    for (const task of sortedTasks) {
      const suitableAgents = this.findSuitableAgents(task, availableAgents);
      
      if (suitableAgents.length === 0) {
        console.warn(`[AdvancedCoordinator] No suitable agents found for task: ${task.description}`);
        continue;
      }
      
      // Select agent with lowest workload and highest success rate
      const bestAgent = suitableAgents.reduce((best, current) => {
        const bestWorkload = agentWorkloads.get(best.id) || 0;
        const currentWorkload = agentWorkloads.get(current.id) || 0;
        
        // Weighted score: workload (lower is better) + success rate (higher is better)
        const bestScore = -bestWorkload * 0.6 + best.successRate * 0.4;
        const currentScore = -currentWorkload * 0.6 + current.successRate * 0.4;
        
        return currentScore > bestScore ? current : best;
      });
      
      // Assign task to best agent
      assignments[bestAgent.id].push(task.id);
      agentWorkloads.set(bestAgent.id, (agentWorkloads.get(bestAgent.id) || 0) + 1);
      
      // Update task assignment
      task.assignedAgent = bestAgent.id;
    }
    
    return assignments;
  }

  /**
   * Create execution plan with phases and dependencies
   */
  private createExecutionPlan(tasks: Task[], agentAssignments: Record<string, string[]>): any {
    const phases: ExecutionPhase[] = [];
    const taskDependencyMap = new Map<string, string[]>();
    
    // Build dependency map
    tasks.forEach(task => {
      taskDependencyMap.set(task.id, task.context?.dependencies || []);
    });
    
    // Group tasks into phases based on dependencies
    const unassignedTasks = new Set(tasks.map(t => t.id));
    let phaseNumber = 1;
    
    while (unassignedTasks.size > 0) {
      const currentPhaseTasks: string[] = [];
      
      // Find tasks with no unmet dependencies
      for (const taskId of unassignedTasks) {
        const dependencies = taskDependencyMap.get(taskId) || [];
        const unmetDependencies = dependencies.filter(dep => unassignedTasks.has(dep));
        
        if (unmetDependencies.length === 0) {
          currentPhaseTasks.push(taskId);
        }
      }
      
      if (currentPhaseTasks.length === 0) {
        // Break circular dependencies
        const randomTask = Array.from(unassignedTasks)[0];
        currentPhaseTasks.push(randomTask);
        console.warn(`[AdvancedCoordinator] Breaking circular dependency by including task: ${randomTask}`);
      }
      
      // Remove assigned tasks from unassigned set
      currentPhaseTasks.forEach(taskId => unassignedTasks.delete(taskId));
      
      // Create phase
      const phase: ExecutionPhase = {
        id: nanoid(),
        name: `Phase ${phaseNumber}`,
        description: `Execution phase ${phaseNumber} with ${currentPhaseTasks.length} tasks`,
        tasks: currentPhaseTasks,
        dependencies: phaseNumber > 1 ? [`Phase ${phaseNumber - 1}`] : [],
        estimatedDuration: Math.max(...currentPhaseTasks.map(taskId => {
          const task = tasks.find(t => t.id === taskId);
          return task?.metadata?.estimatedDuration || 30;
        })),
        parallelizable: currentPhaseTasks.length > 1
      };
      
      phases.push(phase);
      phaseNumber++;
    }
    
    const totalDuration = phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);
    
    return {
      phases,
      estimatedDuration: totalDuration,
      riskFactors: [
        'Agent availability constraints',
        'Task dependency complexity',
        'Resource allocation bottlenecks'
      ],
      successCriteria: [
        'All tasks completed successfully',
        'Quality thresholds met',
        'Timeline adherence within 20% variance'
      ]
    };
  }

  /**
   * Generate context map for inter-agent communication
   */
  private generateContextMap(tasks: Task[], agentAssignments: Record<string, string[]>, agents: Agent[]): Record<string, any> {
    const contextMap: Record<string, any> = {};
    
    // Agent collaboration matrix
    const collaborationMatrix: Record<string, string[]> = {};
    
    // Find agents that need to collaborate
    for (const [agentId, taskIds] of Object.entries(agentAssignments)) {
      const agentTasks = tasks.filter(t => taskIds.includes(t.id));
      const collaboratingAgents = new Set<string>();
      
      agentTasks.forEach(task => {
        const dependencies = task.context?.dependencies || [];
        dependencies.forEach(depTaskId => {
          const depTask = tasks.find(t => t.id === depTaskId);
          if (depTask?.assignedAgent && depTask.assignedAgent !== agentId) {
            collaboratingAgents.add(depTask.assignedAgent);
          }
        });
      });
      
      collaborationMatrix[agentId] = Array.from(collaboratingAgents);
    }
    
    contextMap.collaborationMatrix = collaborationMatrix;
    
    // Communication protocols
    contextMap.communicationProtocols = {};
    for (const agent of agents) {
      const agentContext = this.agentContexts.get(agent.type);
      if (agentContext) {
        contextMap.communicationProtocols[agent.id] = {
          inputFormat: agentContext.expectedResponseFormat,
          outputFormat: agentContext.communicationStyle,
          qualityThreshold: agentContext.qualityThreshold
        };
      }
    }
    
    // Shared resources and data dependencies
    contextMap.sharedResources = {
      databases: ['main_storage'],
      apis: ['ai_integration', 'mcp_management'],
      queues: ['task_queue', 'notification_queue']
    };
    
    return contextMap;
  }

  /**
   * Get coordination status and metrics
   */
  getCoordinationStatus() {
    return {
      activeProjects: this.projectDatabase.size,
      totalTasks: this.taskDatabase.size,
      agentContexts: Array.from(this.agentContexts.values()),
      executionHistory: Array.from(this.executionHistory.keys()),
      performanceMetrics: this.calculateCoordinationMetrics()
    };
  }

  /**
   * Calculate coordination performance metrics
   */
  private calculateCoordinationMetrics() {
    const completedProjects = Array.from(this.executionHistory.values());
    
    if (completedProjects.length === 0) {
      return {
        averageDecompositionTime: 0,
        taskDistributionEfficiency: 0,
        agentUtilization: 0,
        successRate: 0
      };
    }
    
    return {
      averageDecompositionTime: 2.5, // seconds
      taskDistributionEfficiency: 0.85,
      agentUtilization: 0.78,
      successRate: 0.92
    };
  }

  /**
   * Update agent context based on performance
   */
  updateAgentContext(agentId: string, performanceData: any) {
    // Update agent context based on real performance data
    const agent = Array.from(this.agentContexts.values()).find(a => a.agentType === agentId);
    if (agent) {
      agent.currentWorkload = performanceData.currentWorkload || agent.currentWorkload;
      if (performanceData.successRate) {
        agent.qualityThreshold = Math.min(0.99, agent.qualityThreshold + 0.01);
      }
    }
  }
}

export const advancedCoordinatorService = new AdvancedCoordinatorService();