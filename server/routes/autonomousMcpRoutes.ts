import { Router } from 'express';
import { autonomousMcpCreator } from '../services/autonomousMcpCreator';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { cacheMiddleware } from '../middleware/requestCache';
import { logger } from '../utils/logger';

const router = Router();

// Analyze orchestration context and generate autonomous MCP plan
router.post('/analyze', asyncHandler(async (req, res) => {
  const { taskId, taskType, requirements, constraints, expectedOutputs, dependencies, timeline, complexity, metadata } = req.body;
  
  if (!taskId || !taskType || !requirements || !Array.isArray(requirements)) {
    throw createError('Missing required fields: taskId, taskType, requirements', 400, 'VALIDATION_ERROR', 'AutonomousMcp');
  }
  
  const context = {
    taskId,
    taskType,
    requirements,
    constraints: constraints || [],
    expectedOutputs: expectedOutputs || [],
    dependencies: dependencies || [],
    timeline: timeline || '1 hour',
    complexity: complexity || 'medium',
    metadata: metadata || {}
  };
  
  const plan = await autonomousMcpCreator.analyzeAndCreatePlan(context);
  
  res.status(201).json({
    success: true,
    plan,
    message: `Generated autonomous MCP plan with ${plan.requiredTools.length} tools and ${plan.mcpServers.length} servers`
  });
}));

// Execute autonomous MCP creation and deployment
router.post('/execute/:planId', asyncHandler(async (req, res) => {
  const { planId } = req.params;
  
  if (!planId) {
    throw createError('Plan ID is required', 400, 'VALIDATION_ERROR', 'AutonomousMcp');
  }
  
  const result = await autonomousMcpCreator.executeAutonomousCreation(planId);
  
  res.json({
    success: result.status !== 'failed',
    result,
    message: `Execution ${result.status}: ${result.deployedServers.length} servers deployed, ${result.createdTools.length} tools created`
  });
}));

// Get autonomous MCP creation capabilities
router.get('/capabilities', cacheMiddleware({ ttl: 300000 }), asyncHandler(async (req, res) => {
  const capabilities = {
    supportedTaskTypes: [
      'data_processing',
      'api_integration', 
      'workflow_automation',
      'ml_pipeline',
      'custom'
    ],
    supportedRuntimes: ['python', 'node'],
    supportedFrameworks: {
      python: ['flask', 'fastapi'],
      node: ['express']
    },
    complexityLevels: ['low', 'medium', 'high'],
    estimatedTimelines: {
      low: '15-45 minutes',
      medium: '30-90 minutes', 
      high: '60-180 minutes'
    },
    maxToolsPerServer: 10,
    maxServersPerPlan: 5,
    features: [
      'AI-powered requirement analysis',
      'Automatic code generation',
      'Docker containerization',
      'Health monitoring',
      'Integration testing',
      'Rollback capabilities'
    ]
  };
  
  res.json(capabilities);
}));

// Get autonomous MCP creation templates
router.get('/templates', cacheMiddleware({ ttl: 600000 }), asyncHandler(async (req, res) => {
  const { taskType, runtime } = req.query;
  
  const templates = {
    data_processing: {
      description: 'Create tools for data ingestion, transformation, and output',
      commonTools: ['data_validator', 'data_transformer', 'data_exporter'],
      frameworks: ['flask', 'fastapi', 'express'],
      estimatedComplexity: 'medium'
    },
    api_integration: {
      description: 'Build connectors and adapters for external APIs',
      commonTools: ['api_client', 'auth_handler', 'response_mapper'],
      frameworks: ['flask', 'express'],
      estimatedComplexity: 'low'
    },
    workflow_automation: {
      description: 'Automate complex business processes and workflows',
      commonTools: ['workflow_engine', 'task_scheduler', 'notification_sender'],
      frameworks: ['flask', 'fastapi', 'express'],
      estimatedComplexity: 'high'
    },
    ml_pipeline: {
      description: 'Create ML model training and inference pipelines',
      commonTools: ['data_preprocessor', 'model_trainer', 'inference_engine'],
      frameworks: ['flask', 'fastapi'],
      estimatedComplexity: 'high'
    },
    custom: {
      description: 'Custom tools based on specific requirements',
      commonTools: ['custom_processor', 'custom_api', 'custom_service'],
      frameworks: ['flask', 'fastapi', 'express'],
      estimatedComplexity: 'medium'
    }
  };
  
  if (taskType && templates[taskType as keyof typeof templates]) {
    res.json({ template: templates[taskType as keyof typeof templates] });
  } else {
    res.json({ templates });
  }
}));

// Validate orchestration context
router.post('/validate', asyncHandler(async (req, res) => {
  const context = req.body;
  
  const validation = {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    suggestions: [] as string[]
  };
  
  // Validate required fields
  if (!context.taskId) validation.errors.push('taskId is required');
  if (!context.taskType) validation.errors.push('taskType is required');
  if (!context.requirements || !Array.isArray(context.requirements)) {
    validation.errors.push('requirements must be a non-empty array');
  }
  
  // Validate task type
  const validTaskTypes = ['data_processing', 'api_integration', 'workflow_automation', 'ml_pipeline', 'custom'];
  if (context.taskType && !validTaskTypes.includes(context.taskType)) {
    validation.errors.push(`taskType must be one of: ${validTaskTypes.join(', ')}`);
  }
  
  // Validate complexity
  const validComplexities = ['low', 'medium', 'high'];
  if (context.complexity && !validComplexities.includes(context.complexity)) {
    validation.errors.push(`complexity must be one of: ${validComplexities.join(', ')}`);
  }
  
  // Warnings for optimization
  if (context.requirements && context.requirements.length > 10) {
    validation.warnings.push('Large number of requirements may increase complexity and deployment time');
  }
  
  if (context.dependencies && context.dependencies.length > 20) {
    validation.warnings.push('Many dependencies may cause version conflicts or deployment issues');
  }
  
  // Suggestions for improvement
  if (!context.expectedOutputs || context.expectedOutputs.length === 0) {
    validation.suggestions.push('Add expectedOutputs to improve tool generation accuracy');
  }
  
  if (!context.constraints || context.constraints.length === 0) {
    validation.suggestions.push('Add constraints to ensure compliance with system limitations');
  }
  
  validation.valid = validation.errors.length === 0;
  
  res.json(validation);
}));

// Get autonomous MCP creation examples
router.get('/examples', cacheMiddleware({ ttl: 3600000 }), asyncHandler(async (req, res) => {
  const examples = {
    data_processing: {
      context: {
        taskId: 'dp_001',
        taskType: 'data_processing',
        requirements: [
          'Process CSV files with customer data',
          'Validate email addresses and phone numbers',
          'Transform data to standardized format',
          'Export cleaned data to JSON'
        ],
        constraints: [
          'Must handle files up to 10MB',
          'Processing time under 30 seconds',
          'Maintain data privacy'
        ],
        expectedOutputs: [
          'Cleaned customer data in JSON format',
          'Validation report with error details',
          'Processing statistics'
        ],
        complexity: 'medium'
      },
      estimatedResult: {
        tools: 4,
        servers: 1,
        timeline: '45 minutes'
      }
    },
    api_integration: {
      context: {
        taskId: 'api_001',
        taskType: 'api_integration',
        requirements: [
          'Connect to external CRM API',
          'Authenticate using OAuth 2.0',
          'Sync customer records bidirectionally',
          'Handle rate limiting'
        ],
        constraints: [
          'API calls limited to 1000/hour',
          'Must retry failed requests',
          'Secure credential storage'
        ],
        expectedOutputs: [
          'Synchronized customer data',
          'API call logs',
          'Error handling reports'
        ],
        complexity: 'low'
      },
      estimatedResult: {
        tools: 3,
        servers: 1,
        timeline: '30 minutes'
      }
    },
    workflow_automation: {
      context: {
        taskId: 'wf_001',
        taskType: 'workflow_automation',
        requirements: [
          'Automate invoice processing workflow',
          'Extract data from PDF invoices',
          'Validate against purchase orders',
          'Route for approval based on amount',
          'Send notifications to stakeholders'
        ],
        constraints: [
          'Support multiple PDF formats',
          'Approval routing based on business rules',
          'Audit trail required'
        ],
        expectedOutputs: [
          'Processed invoice data',
          'Approval workflow status',
          'Notification delivery confirmations',
          'Audit trail records'
        ],
        complexity: 'high'
      },
      estimatedResult: {
        tools: 6,
        servers: 2,
        timeline: '120 minutes'
      }
    }
  };
  
  res.json(examples);
}));

// Get autonomous MCP plan status
router.get('/plans/:planId/status', asyncHandler(async (req, res) => {
  const { planId } = req.params;
  
  // This would retrieve actual plan status from database
  // For now, return placeholder structure
  const status = {
    planId,
    status: 'completed',
    phase: 'deployment',
    progress: {
      analysis: 100,
      generation: 100,
      building: 100,
      deployment: 85,
      testing: 60
    },
    deployedServers: 2,
    totalServers: 2,
    createdTools: 5,
    totalTools: 5,
    errors: [],
    lastUpdate: new Date().toISOString()
  };
  
  res.json(status);
}));

export default router;