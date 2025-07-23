import { storage } from '../storage';
import { aiIntegrationService } from './aiIntegration';
import { mcpManagerService } from './mcpManager';
import { nanoid } from 'nanoid';

interface TaskRequest {
  type: string;
  description: string;
  priority?: number;
  metadata?: Record<string, any>;
}

interface AgentCapability {
  type: string;
  description: string;
  requiredSkills: string[];
}

export class AgentOrchestratorService {
  private agentCapabilities: Map<string, AgentCapability[]> = new Map();

  constructor() {
    this.initializeAgentCapabilities();
  }

  private initializeAgentCapabilities(): void {
    this.agentCapabilities.set('maestro', [
      {
        type: 'task-orchestration',
        description: 'Orchestrate complex multi-agent workflows',
        requiredSkills: ['workflow-management', 'agent-coordination', 'task-decomposition']
      },
      {
        type: 'system-monitoring',
        description: 'Monitor system health and performance',
        requiredSkills: ['metrics-analysis', 'alerting', 'diagnostics']
      }
    ]);

    this.agentCapabilities.set('ai-integration', [
      {
        type: 'ai-processing',
        description: 'Process AI requests with fallback handling',
        requiredSkills: ['multi-provider-ai', 'circuit-breaking', 'optimization']
      },
      {
        type: 'prompt-optimization',
        description: 'Optimize prompts for better AI responses',
        requiredSkills: ['prompt-engineering', 'testing', 'refinement']
      }
    ]);

    this.agentCapabilities.set('mcp-management', [
      {
        type: 'server-discovery',
        description: 'Discover and catalog MCP servers',
        requiredSkills: ['file-system-analysis', 'dependency-detection', 'configuration']
      },
      {
        type: 'docker-deployment',
        description: 'Build and deploy Docker containers',
        requiredSkills: ['docker', 'containerization', 'orchestration']
      }
    ]);

    this.agentCapabilities.set('project', [
      {
        type: 'project-management',
        description: 'Manage project lifecycle and coordination',
        requiredSkills: ['planning', 'resource-allocation', 'timeline-management']
      }
    ]);

    this.agentCapabilities.set('auth', [
      {
        type: 'authentication',
        description: 'Handle authentication and authorization',
        requiredSkills: ['security', 'access-control', 'session-management']
      }
    ]);

    this.agentCapabilities.set('cognitive-refiner', [
      {
        type: 'learning-optimization',
        description: 'Learn and optimize system performance',
        requiredSkills: ['machine-learning', 'performance-analysis', 'adaptation']
      }
    ]);
  }

  async submitTask(request: TaskRequest): Promise<string> {
    const taskId = nanoid();
    
    // Create task in database
    const task = await storage.createTask({
      id: taskId,
      type: request.type,
      description: request.description,
      priority: request.priority || 5,
      status: 'pending'
    });

    // Find suitable agent
    const agent = await this.findSuitableAgent(request.type);
    
    if (agent) {
      await this.assignTaskToAgent(taskId, agent.id);
      await this.logInfo('maestro-agent', `Task ${taskId} assigned to agent ${agent.id}`);
    } else {
      await this.logWarning('maestro-agent', `No suitable agent found for task type: ${request.type}`);
    }

    return taskId;
  }

  private async findSuitableAgent(taskType: string): Promise<any> {
    const agents = await storage.getAllAgents();
    const availableAgents = agents.filter(agent => 
      agent.status === 'idle' && 
      agent.healthScore > 0.8
    );

    // Find agent with matching capabilities
    for (const agent of availableAgents) {
      const capabilities = this.agentCapabilities.get(agent.type);
      if (capabilities?.some(cap => cap.type === taskType || taskType.includes(cap.type.split('-')[0]))) {
        return agent;
      }
    }

    // Fallback to any available agent
    return availableAgents[0] || null;
  }

  private async assignTaskToAgent(taskId: string, agentId: string): Promise<void> {
    await storage.assignTask(taskId, agentId);
    
    // Update agent status
    const agent = await storage.getAgent(agentId);
    if (agent) {
      const currentTasks = [...agent.currentTasks, taskId];
      await storage.updateAgent(agentId, {
        status: 'busy',
        currentTasks
      });
    }
  }

  async processTask(taskId: string): Promise<void> {
    const task = await storage.getTask(taskId);
    if (!task || !task.assignedAgent) {
      throw new Error(`Task ${taskId} not found or not assigned`);
    }

    try {
      await storage.updateTask(taskId, { 
        status: 'running',
        progress: 0
      });

      let result: any;

      // Route task to appropriate service based on type
      switch (task.type) {
        case 'ai-processing':
        case 'prompt-optimization':
          result = await this.processAITask(task);
          break;
        case 'server-discovery':
        case 'docker-deployment':
          result = await this.processMCPTask(task);
          break;
        case 'system-monitoring':
          result = await this.processMonitoringTask(task);
          break;
        default:
          result = await this.processGenericTask(task);
      }

      await this.completeTask(taskId, result);
      
    } catch (error) {
      await this.failTask(taskId, error.message);
    }
  }

  private async processAITask(task: any): Promise<any> {
    // Update progress
    await storage.updateTask(task.id, { progress: 25 });

    const response = await aiIntegrationService.processRequest({
      prompt: task.description,
      provider: task.metadata?.provider
    });

    await storage.updateTask(task.id, { progress: 75 });
    return response;
  }

  private async processMCPTask(task: any): Promise<any> {
    await storage.updateTask(task.id, { progress: 25 });

    if (task.type === 'server-discovery') {
      await mcpManagerService.syncWithDatabase();
      const servers = await storage.getAllMcpServers();
      await storage.updateTask(task.id, { progress: 75 });
      return { discoveredServers: servers.length };
    }

    if (task.type === 'docker-deployment' && task.metadata?.serverId) {
      const image = await mcpManagerService.buildDockerImage(task.metadata.serverId);
      await mcpManagerService.deployServer(task.metadata.serverId);
      await storage.updateTask(task.id, { progress: 75 });
      return { dockerImage: image };
    }

    return { status: 'completed' };
  }

  private async processMonitoringTask(task: any): Promise<any> {
    await storage.updateTask(task.id, { progress: 25 });

    // Collect system metrics
    const agents = await storage.getAllAgents();
    const activeTasks = await storage.getTasksByStatus('running');
    const mcpServers = await storage.getAllMcpServers();

    const metrics = {
      uptime: Math.floor(process.uptime()),
      tasksCompleted: (await storage.getTasksByStatus('completed')).length,
      tasksFailed: (await storage.getTasksByStatus('failed')).length,
      averageResponseTime: this.calculateAverageResponseTime(agents),
      systemEfficiency: this.calculateSystemEfficiency(agents),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
      cpuUsage: Math.round(Math.random() * 30 + 20), // Simplified CPU usage
      activeAgents: agents.filter(a => a.status !== 'offline').length,
      queueSize: activeTasks.length
    };

    await storage.createSystemMetrics(metrics);
    await storage.updateTask(task.id, { progress: 75 });
    
    return metrics;
  }

  private async processGenericTask(task: any): Promise<any> {
    await storage.updateTask(task.id, { progress: 50 });
    
    // Simulate task processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { status: 'completed', description: task.description };
  }

  private async completeTask(taskId: string, result: any): Promise<void> {
    const completedAt = new Date();
    const task = await storage.getTask(taskId);
    const executionTime = task ? Math.floor((completedAt.getTime() - new Date(task.createdAt).getTime()) / 1000) : 0;

    await storage.updateTask(taskId, {
      status: 'completed',
      progress: 100,
      result,
      completedAt,
      executionTime,
      qualityScore: 0.9 + Math.random() * 0.1 // Simulate quality score
    });

    // Update agent status
    if (task?.assignedAgent) {
      await this.updateAgentAfterTask(task.assignedAgent, taskId, true);
    }

    await this.logInfo('maestro-agent', `Task ${taskId} completed successfully`);
  }

  private async failTask(taskId: string, error: string): Promise<void> {
    const task = await storage.getTask(taskId);
    
    await storage.updateTask(taskId, {
      status: 'failed',
      error
    });

    // Update agent status
    if (task?.assignedAgent) {
      await this.updateAgentAfterTask(task.assignedAgent, taskId, false);
    }

    await this.logError('maestro-agent', `Task ${taskId} failed: ${error}`);
  }

  private async updateAgentAfterTask(agentId: string, taskId: string, success: boolean): Promise<void> {
    const agent = await storage.getAgent(agentId);
    if (!agent) return;

    const currentTasks = agent.currentTasks.filter(id => id !== taskId);
    const totalTasks = agent.totalTasks + 1;
    const successRate = success 
      ? (agent.successRate * agent.totalTasks + 1) / totalTasks
      : (agent.successRate * agent.totalTasks) / totalTasks;

    await storage.updateAgent(agentId, {
      status: currentTasks.length > 0 ? 'busy' : 'idle',
      currentTasks,
      totalTasks,
      successRate,
      healthScore: Math.min(1.0, agent.healthScore + (success ? 0.01 : -0.05))
    });
  }

  private calculateAverageResponseTime(agents: any[]): number {
    if (agents.length === 0) return 0;
    const total = agents.reduce((sum, agent) => sum + agent.averageResponseTime, 0);
    return total / agents.length;
  }

  private calculateSystemEfficiency(agents: any[]): number {
    if (agents.length === 0) return 1.0;
    const total = agents.reduce((sum, agent) => sum + agent.healthScore, 0);
    return total / agents.length;
  }

  async getSystemStatus(): Promise<any> {
    const agents = await storage.getAllAgents();
    const tasks = await storage.getAllTasks();
    const mcpServers = await storage.getAllMcpServers();
    const alerts = await storage.getUnacknowledgedAlerts();

    return {
      agents: {
        total: agents.length,
        active: agents.filter(a => a.status !== 'offline').length,
        busy: agents.filter(a => a.status === 'busy').length
      },
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      mcpServers: {
        total: mcpServers.length,
        deployed: mcpServers.filter(s => s.status === 'deployed').length,
        building: mcpServers.filter(s => s.status === 'building').length
      },
      alerts: {
        unacknowledged: alerts.length
      }
    };
  }

  private async logInfo(service: string, message: string): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'info',
        service,
        message,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log info:', error);
    }
  }

  private async logWarning(service: string, message: string): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'warning',
        service,
        message,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log warning:', error);
    }
  }

  private async logError(service: string, message: string): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'error',
        service,
        message,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }
}

export const agentOrchestratorService = new AgentOrchestratorService();
