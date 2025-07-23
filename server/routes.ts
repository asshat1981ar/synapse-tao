import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { agentOrchestratorService } from "./services/agentOrchestrator";
import { aiIntegrationService } from "./services/aiIntegration";
import { mcpManagerService } from "./services/mcpManager";
import { WebSocketManager } from "./services/websocketManager";
import { BlackboxClient } from "./services/blackboxClient";
import { cognitiveRefinerService } from "./services/cognitiveRefiner";
import { advancedCoordinatorService } from "./services/advancedCoordinator";
import { collaborativeWorkflowService } from "./services/collaborativeWorkflow";
import { advancedAnalyticsService } from "./services/advancedAnalytics";
import { registerChatRoutes } from "./routes/chatRoutes";
import { nanoid } from "nanoid";
import { cacheMiddleware } from './middleware/requestCache.js';
import { asyncHandler, createError } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket manager
  const wsManager = new WebSocketManager(httpServer);
  
  // Initialize collaborative workflow service
  const collaborativeWorkflowSvc = collaborativeWorkflowService(wsManager);

  // Register chat routes for IDE
  registerChatRoutes(app);

  // Register Maestro Orchestrator routes (Unified Entry Point)
  const maestroRoutes = await import('./routes/maestroRoutes');
  app.use('/api/maestro', maestroRoutes.default);

  // Register TAO Loop routes (Project Chimera integration)
  const taoRoutes = await import('./routes/taoRoutes');
  app.use('/api/tao', taoRoutes.default);

  // Register Codebase Optimizer routes
  const optimizerRoutes = await import('./routes/optimizerRoutes');
  app.use('/api/optimizer', optimizerRoutes.default);

  // Register Prompt Cache routes
  const promptCacheRoutes = await import('./routes/promptCacheRoutes');
  app.use('/api/cache', promptCacheRoutes.default);

  // Register Learning Optimization routes
  const learningRoutes = await import('./routes/learningRoutes');
  app.use('/api/learning', learningRoutes.default);

  // Register Autonomous MCP Creation routes
  const autonomousMcpRoutes = await import('./routes/autonomousMcpRoutes');
  app.use('/api/autonomous-mcp', autonomousMcpRoutes.default);

  // Register Smithery Integration routes
  const smitheryRoutes = await import('./routes/smitheryRoutes');
  app.use('/api/smithery', smitheryRoutes.default);

  // Register HuggingFace Integration routes
  const huggingfaceRoutes = await import('./routes/huggingfaceRoutes');
  app.use('/api/huggingface', huggingfaceRoutes.default);

  // Initialize system with default agents
  await initializeSystem();

  // Start background processes
  startBackgroundProcesses(wsManager);

  // ============================================================================
  // SYSTEM ROUTES
  // ============================================================================

  app.get('/api/system/status', async (req, res) => {
    try {
      const status = await agentOrchestratorService.getSystemStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/system/metrics', cacheMiddleware({ ttl: 5000 }), asyncHandler(async (req, res) => {
    const metrics = await storage.getLatestSystemMetrics();
    if (!metrics) {
      throw createError('No metrics available', 404, 'NOT_FOUND', 'System');
    }
    res.json(metrics);
  }));

  app.get('/api/system/metrics/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = await storage.getSystemMetricsHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // AGENT ROUTES
  // ============================================================================

  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/agents/:id', async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/agents/:id/heartbeat', async (req, res) => {
    try {
      await storage.updateAgentHeartbeat(req.params.id);
      res.json({ status: 'success' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch('/api/agents/:id', async (req, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      wsManager.broadcast('agents', { action: 'updated', agent }, 'agent_update');
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // TASK ROUTES
  // ============================================================================

  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/tasks/:id', async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const taskId = await agentOrchestratorService.submitTask(req.body);
      const task = await storage.getTask(taskId);
      
      wsManager.broadcast('tasks', { action: 'created', task }, 'task_update');
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/tasks/:id/process', async (req, res) => {
    try {
      await agentOrchestratorService.processTask(req.params.id);
      const task = await storage.getTask(req.params.id);
      
      wsManager.broadcast('tasks', { action: 'processed', task }, 'task_update');
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // MCP SERVER ROUTES
  // ============================================================================

  app.get('/api/mcp/servers', async (req, res) => {
    try {
      const servers = await storage.getAllMcpServers();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/mcp/servers/:id', async (req, res) => {
    try {
      const server = await storage.getMcpServer(req.params.id);
      if (!server) {
        return res.status(404).json({ error: 'MCP server not found' });
      }
      res.json(server);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/mcp/discover', async (req, res) => {
    try {
      await mcpManagerService.syncWithDatabase();
      const servers = await storage.getAllMcpServers();
      
      wsManager.broadcast('mcp_servers', { action: 'discovered', servers }, 'mcp_update');
      res.json({ discovered: servers.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/mcp/servers/:id/build', async (req, res) => {
    try {
      const dockerImage = await mcpManagerService.buildDockerImage(req.params.id);
      const server = await storage.getMcpServer(req.params.id);
      
      wsManager.broadcast('mcp_servers', { action: 'built', server }, 'mcp_update');
      res.json({ dockerImage });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/mcp/servers/:id/deploy', async (req, res) => {
    try {
      await mcpManagerService.deployServer(req.params.id);
      const server = await storage.getMcpServer(req.params.id);
      
      wsManager.broadcast('mcp_servers', { action: 'deployed', server }, 'mcp_update');
      res.json({ status: 'deployed' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/mcp/servers/:id/stop', async (req, res) => {
    try {
      await mcpManagerService.stopServer(req.params.id);
      const server = await storage.getMcpServer(req.params.id);
      
      wsManager.broadcast('mcp_servers', { action: 'stopped', server }, 'mcp_update');
      res.json({ status: 'stopped' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // AI INTEGRATION ROUTES
  // ============================================================================

  app.post('/api/ai/process', async (req, res) => {
    try {
      const response = await aiIntegrationService.processRequest(req.body);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/ai/providers/status', async (req, res) => {
    try {
      const status = aiIntegrationService.getProviderStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // ALERT ROUTES
  // ============================================================================

  app.get('/api/alerts', async (req, res) => {
    try {
      const alerts = await storage.getAllAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/alerts/unacknowledged', async (req, res) => {
    try {
      const alerts = await storage.getUnacknowledgedAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/alerts/:id/acknowledge', async (req, res) => {
    try {
      const alert = await storage.acknowledgeAlert(req.params.id);
      wsManager.broadcast('alerts', { action: 'acknowledged', alert }, 'alert_update');
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // SYSTEM LOGS ROUTES
  // ============================================================================

  app.get('/api/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const level = req.query.level as string;
      const logs = await storage.getSystemLogs(limit, level);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // BLACKBOXAI ROUTES  
  // ============================================================================

  app.get('/api/blackbox/models', async (req, res) => {
    try {
      if (!process.env.BLACKBOX_API_KEY) {
        return res.status(400).json({ error: 'BLACKBOX_API_KEY not configured' });
      }
      
      const client = new BlackboxClient(process.env.BLACKBOX_API_KEY, process.env.BLACKBOX_API_URL);
      const models = client.getAvailableModels();
      res.json({ models });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/blackbox/chat', async (req, res) => {
    try {
      if (!process.env.BLACKBOX_API_KEY) {
        return res.status(400).json({ error: 'BLACKBOX_API_KEY not configured' });
      }

      const { prompt, model, maxTokens, temperature } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const client = new BlackboxClient(process.env.BLACKBOX_API_KEY, process.env.BLACKBOX_API_URL);
      const result = await client.sendPrompt(prompt, model, { maxTokens, temperature });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/blackbox/test', async (req, res) => {
    try {
      if (!process.env.BLACKBOX_API_KEY) {
        return res.status(400).json({ error: 'BLACKBOX_API_KEY not configured' });
      }

      const client = new BlackboxClient(process.env.BLACKBOX_API_KEY, process.env.BLACKBOX_API_URL);
      const isConnected = await client.testConnection();
      
      res.json({ 
        connected: isConnected,
        models: client.getAvailableModels(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // AI Integration route using BlackboxAI
  app.post('/api/ai/process', async (req, res) => {
    try {
      const { prompt, provider, model, maxTokens } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const result = await aiIntegrationService.processRequest({
        prompt,
        provider: provider || 'blackboxai',
        model,
        maxTokens
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // DEEPSEEK AI ROUTES
  // ============================================================================

  app.get('/api/deepseek/models', async (req, res) => {
    try {
      const DeepSeekClient = (await import('./services/deepseekClient')).default;
      const client = new DeepSeekClient();
      const models = client.getAvailableModels();
      res.json({ models });
    } catch (error) {
      console.error('DeepSeek models error:', error);
      res.status(500).json({ error: 'Failed to get DeepSeek models' });
    }
  });

  app.post('/api/deepseek/chat', async (req, res) => {
    try {
      const { prompt, model, maxTokens, systemPrompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const DeepSeekClient = (await import('./services/deepseekClient')).default;
      const client = new DeepSeekClient();
      
      const result = await client.sendPrompt(prompt, {
        model,
        maxTokens: maxTokens || 150,
        systemPrompt
      });

      res.json(result);
    } catch (error) {
      console.error('DeepSeek chat error:', error);
      res.status(500).json({ error: `DeepSeek API error: ${(error as Error).message}` });
    }
  });

  app.post('/api/deepseek/test', async (req, res) => {
    try {
      const DeepSeekClient = (await import('./services/deepseekClient')).default;
      const client = new DeepSeekClient();
      const result = await client.testConnection();
      res.json(result);
    } catch (error) {
      console.error('DeepSeek test error:', error);
      res.status(500).json({ error: `DeepSeek test failed: ${(error as Error).message}` });
    }
  });

  app.post('/api/deepseek/code', async (req, res) => {
    try {
      const { prompt, language, maxTokens } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const DeepSeekClient = (await import('./services/deepseekClient')).default;
      const client = new DeepSeekClient();
      
      const result = await client.generateCode(prompt, language, maxTokens);
      res.json(result);
    } catch (error) {
      console.error('DeepSeek code generation error:', error);
      res.status(500).json({ error: `DeepSeek code generation error: ${(error as Error).message}` });
    }
  });



  app.get('/api/openai/models', async (req, res) => {
    try {
      const OpenAIClient = (await import('./services/openaiClient')).default;
      const client = new OpenAIClient();
      const models = client.getAvailableModels();
      res.json({ models });
    } catch (error) {
      console.error('OpenAI models error:', error);
      res.status(500).json({ error: 'Failed to get OpenAI models' });
    }
  });

  app.post('/api/openai/chat', async (req, res) => {
    try {
      const { prompt, model, maxTokens, systemPrompt, responseFormat, images } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const OpenAIClient = (await import('./services/openaiClient')).default;
      const client = new OpenAIClient();
      
      const result = await client.sendPrompt(prompt, {
        model,
        maxTokens: maxTokens || 150,
        systemPrompt,
        responseFormat,
        images
      });

      res.json(result);
    } catch (error) {
      console.error('OpenAI chat error:', error);
      res.status(500).json({ error: `OpenAI API error: ${(error as Error).message}` });
    }
  });

  app.post('/api/openai/test', async (req, res) => {
    try {
      const OpenAIClient = (await import('./services/openaiClient')).default;
      const client = new OpenAIClient();
      const result = await client.testConnection();
      res.json(result);
    } catch (error) {
      console.error('OpenAI test error:', error);
      res.status(500).json({ error: `OpenAI test failed: ${(error as Error).message}` });
    }
  });

  app.post('/api/openai/image', async (req, res) => {
    try {
      const { prompt, model, size, quality, style } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const OpenAIClient = (await import('./services/openaiClient')).default;
      const client = new OpenAIClient();
      
      const result = await client.generateImage(prompt, {
        model, size, quality, style
      });

      res.json(result);
    } catch (error) {
      console.error('OpenAI image generation error:', error);
      res.status(500).json({ error: `OpenAI image generation error: ${(error as Error).message}` });
    }
  });

  // ============================================================================
  // COGNITIVE REFINER ROUTES
  // ============================================================================

  app.post('/api/cognitive-refiner/optimize', async (req, res) => {
    try {
      const { agents } = req.body;
      const result = await cognitiveRefinerService.optimizeAgentPerformance(agents);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/cognitive-refiner/status', async (req, res) => {
    try {
      const status = cognitiveRefinerService.getOptimizationStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/cognitive-refiner/config', async (req, res) => {
    try {
      const config = req.body;
      cognitiveRefinerService.updateConfig(config);
      res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // ADVANCED COORDINATOR ROUTES
  // ============================================================================

  app.post('/api/coordinator/decompose', async (req, res) => {
    try {
      const { project, agents } = req.body;
      const result = await advancedCoordinatorService.decomposeProjectRequest(project, agents);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/coordinator/status', async (req, res) => {
    try {
      const status = advancedCoordinatorService.getCoordinationStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // COLLABORATIVE WORKFLOW ROUTES
  // ============================================================================

  app.post('/api/collaborative/sessions', async (req, res) => {
    try {
      const { workflowId, userId } = req.body;
      const session = await collaborativeWorkflowSvc.createCollaborationSession(workflowId, userId);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/collaborative/sessions/:sessionId/join', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId, userInfo } = req.body;
      await collaborativeWorkflowSvc.joinSession(sessionId, userId, userInfo);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/collaborative/operations', async (req, res) => {
    try {
      const operation = req.body;
      const result = await collaborativeWorkflowSvc.applyOperation(operation);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/collaborative/workflows', async (req, res) => {
    try {
      const workflows = collaborativeWorkflowSvc.listWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/collaborative/stats', async (req, res) => {
    try {
      const stats = collaborativeWorkflowSvc.getCollaborationStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ============================================================================
  // ADVANCED ANALYTICS ROUTES
  // ============================================================================

  app.get('/api/analytics/dashboard', async (req, res) => {
    try {
      const dashboard = advancedAnalyticsService.getAnalyticsDashboard();
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/analytics/trends/:metric', async (req, res) => {
    try {
      const { metric } = req.params;
      const { timeRange } = req.query;
      const trends = advancedAnalyticsService.getPerformanceTrends(metric, timeRange as string);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/analytics/models', async (req, res) => {
    try {
      const models = advancedAnalyticsService.getMLModelPerformance();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/analytics/agents/:agentId/performance', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { agentType, metrics } = req.body;
      advancedAnalyticsService.updateAgentPerformance(agentId, agentType, metrics);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return httpServer;
}

// ============================================================================
// INITIALIZATION AND BACKGROUND PROCESSES
// ============================================================================

async function initializeSystem(): Promise<void> {
  try {
    // Create default agents if they don't exist
    const existingAgents = await storage.getAllAgents();
    const agentTypes = ['maestro', 'ai-integration', 'mcp-management', 'project', 'auth', 'cognitive-refiner'];
    
    for (const type of agentTypes) {
      if (!existingAgents.some(agent => agent.type === type)) {
        await storage.createAgent({
          id: `${type}-01`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
          type,
          status: 'idle',
          healthScore: 1.0,
          successRate: 1.0,
          averageResponseTime: 2.0,
          totalTasks: 0,
          capabilities: getAgentCapabilities(type),
          currentTasks: []
        });
      }
    }

    // Create initial system metrics
    const metrics = await storage.getLatestSystemMetrics();
    if (!metrics) {
      await storage.createSystemMetrics({
        uptime: Math.floor(process.uptime()),
        tasksCompleted: 0,
        tasksFailed: 0,
        averageResponseTime: 2.3,
        systemEfficiency: 1.0,
        memoryUsage: Math.round(process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
        cpuUsage: 20,
        activeAgents: agentTypes.length,
        queueSize: 0
      });
    }

    // Create initial alerts
    const alerts = await storage.getAllAlerts();
    if (alerts.length === 0) {
      await storage.createAlert({
        id: nanoid(),
        type: 'success',
        title: 'System Initialized',
        message: 'Synapse AI orchestration platform is now operational.',
        acknowledged: false
      });
    }

    console.log('System initialized successfully');
  } catch (error) {
    console.error('Failed to initialize system:', error);
  }
}

function getAgentCapabilities(type: string): string[] {
  const capabilities: Record<string, string[]> = {
    'maestro': ['task-orchestration', 'agent-coordination', 'system-monitoring'],
    'ai-integration': ['multi-provider-ai', 'circuit-breaking', 'prompt-optimization'],
    'mcp-management': ['server-discovery', 'docker-deployment', 'containerization'],
    'project': ['project-management', 'resource-allocation', 'planning'],
    'auth': ['authentication', 'authorization', 'security'],
    'cognitive-refiner': ['learning-optimization', 'performance-analysis', 'adaptation']
  };
  
  return capabilities[type] || [];
}

function startBackgroundProcesses(wsManager: WebSocketManager): void {
  // Update system metrics every 30 seconds
  setInterval(async () => {
    try {
      const agents = await storage.getAllAgents();
      const completedTasks = await storage.getTasksByStatus('completed');
      const failedTasks = await storage.getTasksByStatus('failed');
      const runningTasks = await storage.getTasksByStatus('running');

      const metrics = {
        uptime: Math.floor(process.uptime()),
        tasksCompleted: completedTasks.length,
        tasksFailed: failedTasks.length,
        averageResponseTime: calculateAverageResponseTime(agents),
        systemEfficiency: calculateSystemEfficiency(agents),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
        cpuUsage: Math.round(Math.random() * 30 + 20),
        activeAgents: agents.filter(a => a.status !== 'offline').length,
        queueSize: runningTasks.length
      };

      await storage.createSystemMetrics(metrics);
    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  }, 30000);

  // Process pending tasks every 10 seconds
  setInterval(async () => {
    try {
      const pendingTasks = await storage.getTasksByStatus('pending');
      for (const task of pendingTasks.slice(0, 3)) { // Process up to 3 tasks at a time
        if (task.assignedAgent) {
          setTimeout(async () => {
            try {
              await agentOrchestratorService.processTask(task.id);
            } catch (error) {
              console.error(`Failed to process task ${task.id}:`, error);
            }
          }, Math.random() * 5000); // Random delay up to 5 seconds
        }
      }
    } catch (error) {
      console.error('Failed to process pending tasks:', error);
    }
  }, 10000);

  // Update agent heartbeats every 60 seconds
  setInterval(async () => {
    try {
      const agents = await storage.getAllAgents();
      for (const agent of agents) {
        await storage.updateAgentHeartbeat(agent.id);
      }
    } catch (error) {
      console.error('Failed to update agent heartbeats:', error);
    }
  }, 60000);

  console.log('Background processes started');
}

function calculateAverageResponseTime(agents: any[]): number {
  if (agents.length === 0) return 2.3;
  const total = agents.reduce((sum, agent) => sum + agent.averageResponseTime, 0);
  return total / agents.length;
}

function calculateSystemEfficiency(agents: any[]): number {
  if (agents.length === 0) return 1.0;
  const total = agents.reduce((sum, agent) => sum + agent.healthScore, 0);
  return total / agents.length;
}
