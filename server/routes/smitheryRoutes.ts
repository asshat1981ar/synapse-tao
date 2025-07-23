import { Router } from 'express';
import { smitheryClient } from '../services/smitheryClient';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { cacheMiddleware } from '../middleware/requestCache';
import { logger } from '../utils/logger';

const router = Router();

// Search Smithery registry for MCP servers
router.get('/search', cacheMiddleware({ ttl: 300000 }), asyncHandler(async (req, res) => {
  const { query, keywords, transport, limit = 20, offset = 0 } = req.query;
  
  const searchParams = {
    query: query as string,
    keywords: keywords ? (keywords as string).split(',') : undefined,
    transport: transport as 'stdio' | 'shttp',
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  };
  
  const results = await smitheryClient.searchServers(searchParams);
  
  res.json({
    success: true,
    results,
    message: `Found ${results.servers.length} servers in Smithery registry`
  });
}));

// Get detailed information about a specific server
router.get('/servers/:serverId', cacheMiddleware({ ttl: 600000 }), asyncHandler(async (req, res) => {
  const { serverId } = req.params;
  
  if (!serverId) {
    throw createError('Server ID is required', 400, 'VALIDATION_ERROR', 'Smithery');
  }
  
  const server = await smitheryClient.getServerDetails(serverId);
  
  if (!server) {
    throw createError('Server not found', 404, 'NOT_FOUND', 'Smithery');
  }
  
  res.json({
    success: true,
    server,
    message: `Retrieved details for server: ${server.name}`
  });
}));

// Create a new Smithery MCP server project
router.post('/projects', asyncHandler(async (req, res) => {
  const projectSpec = req.body;
  
  if (!projectSpec.id || !projectSpec.name || !projectSpec.tools) {
    throw createError('Missing required fields: id, name, tools', 400, 'VALIDATION_ERROR', 'Smithery');
  }
  
  const result = await smitheryClient.createSmitheryProject(projectSpec);
  
  res.status(result.success ? 201 : 400).json({
    success: result.success,
    result,
    message: result.success 
      ? `Created Smithery project: ${result.serverId}`
      : `Failed to create project: ${result.errors.join(', ')}`
  });
}));

// Publish a Smithery server to the registry
router.post('/projects/:projectId/publish', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { projectPath } = req.body;
  
  if (!projectPath) {
    throw createError('Project path is required', 400, 'VALIDATION_ERROR', 'Smithery');
  }
  
  const result = await smitheryClient.publishServer(projectPath);
  
  res.json({
    success: result.published,
    result,
    message: result.published 
      ? `Published server: ${result.serverId}`
      : `Failed to publish: ${result.errors.join(', ')}`
  });
}));

// Test a Smithery server locally
router.post('/projects/:projectId/test', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { projectPath, testPrompt = 'what tools are available?' } = req.body;
  
  if (!projectPath) {
    throw createError('Project path is required', 400, 'VALIDATION_ERROR', 'Smithery');
  }
  
  const result = await smitheryClient.testServerLocally(projectPath, testPrompt);
  
  res.json({
    success: result.success,
    result,
    message: result.success 
      ? 'Server test completed successfully'
      : `Test failed: ${result.errors.join(', ')}`
  });
}));

// Find relevant tools for a task context
router.post('/tools/find', asyncHandler(async (req, res) => {
  const { taskType, requirements, keywords } = req.body;
  
  if (!taskType || !requirements) {
    throw createError('Missing required fields: taskType, requirements', 400, 'VALIDATION_ERROR', 'Smithery');
  }
  
  const taskContext = {
    taskType,
    requirements: Array.isArray(requirements) ? requirements : [requirements],
    keywords: Array.isArray(keywords) ? keywords : (keywords ? [keywords] : [])
  };
  
  const results = await smitheryClient.findRelevantTools(taskContext);
  
  res.json({
    success: true,
    results,
    message: `Found ${results.exactMatches.length} exact matches and ${results.relatedMatches.length} related tools`
  });
}));

// Generate tool specifications
router.post('/tools/generate', asyncHandler(async (req, res) => {
  const { requirements, existingTools = [] } = req.body;
  
  if (!requirements || !Array.isArray(requirements)) {
    throw createError('Requirements must be a non-empty array', 400, 'VALIDATION_ERROR', 'Smithery');
  }
  
  const tools = await smitheryClient.generateToolSpecifications(requirements, existingTools);
  
  res.json({
    success: true,
    tools,
    message: `Generated ${tools.length} tool specifications`
  });
}));

// Get Smithery capabilities and supported features
router.get('/capabilities', cacheMiddleware({ ttl: 3600000 }), asyncHandler(async (req, res) => {
  const capabilities = {
    supportedTransports: ['stdio', 'shttp'],
    supportedLanguages: ['typescript', 'javascript'],
    features: [
      'AI-powered MCP server creation',
      'Registry search and discovery',
      'Automated testing and validation',
      'One-click publishing',
      'Schema-driven configuration',
      'Real-time development server',
      'Built-in security features'
    ],
    registryStats: {
      totalServers: '200+',
      categories: [
        'API Integration',
        'Data Processing', 
        'Workflow Automation',
        'Development Tools',
        'AI/ML Services'
      ]
    },
    integrationFeatures: [
      'Claude Desktop integration',
      'Cursor IDE support',
      'Gemini CLI compatibility',
      'VS Code extension',
      'Replit deployment'
    ]
  };
  
  res.json(capabilities);
}));

// Get Smithery integration examples
router.get('/examples', cacheMiddleware({ ttl: 3600000 }), asyncHandler(async (req, res) => {
  const examples = {
    basic_api_integration: {
      description: 'Simple API integration with OAuth authentication',
      projectSpec: {
        id: 'example/api-connector',
        name: 'API Connector',
        description: 'Connect to external APIs with OAuth 2.0',
        transport: 'stdio',
        tools: [
          {
            name: 'authenticate',
            description: 'Authenticate with OAuth 2.0',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string' },
                scope: { type: 'string' }
              }
            },
            outputSchema: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                expiresIn: { type: 'number' }
              }
            }
          }
        ],
        config: [
          {
            key: 'CLIENT_SECRET',
            type: 'secret',
            description: 'OAuth client secret'
          }
        ]
      }
    },
    data_processing: {
      description: 'Data transformation and validation tools',
      projectSpec: {
        id: 'example/data-processor',
        name: 'Data Processor',
        description: 'Process and validate data with transformations',
        transport: 'stdio',
        tools: [
          {
            name: 'validate_data',
            description: 'Validate data against schema',
            inputSchema: {
              type: 'object',
              properties: {
                data: { type: 'object' },
                schema: { type: 'object' }
              }
            },
            outputSchema: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                errors: { type: 'array' }
              }
            }
          }
        ]
      }
    },
    workflow_automation: {
      description: 'Workflow orchestration and task management',
      projectSpec: {
        id: 'example/workflow-manager',
        name: 'Workflow Manager',
        description: 'Manage workflows and automate tasks',
        transport: 'shttp',
        tools: [
          {
            name: 'create_workflow',
            description: 'Create a new workflow',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                steps: { type: 'array' }
              }
            },
            outputSchema: {
              type: 'object',
              properties: {
                workflowId: { type: 'string' },
                status: { type: 'string' }
              }
            }
          }
        ]
      }
    }
  };
  
  res.json(examples);
}));

export default router;