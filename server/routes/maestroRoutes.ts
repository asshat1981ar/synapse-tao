import { Router } from 'express';
import { maestroOrchestrator, type MaestroRequest } from '../services/maestroOrchestrator';

const router = Router();

/**
 * Main orchestration endpoint - unified entry point for all AI requests
 */
router.post('/orchestrate', async (req, res) => {
  try {
    const { input, context, options } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Input is required and must be a string'
      });
    }

    console.log(`[MaestroAPI] Received orchestration request`);
    console.log(`[MaestroAPI] Input length: ${input.length} characters`);
    console.log(`[MaestroAPI] Context provided: ${context ? 'yes' : 'no'}`);
    console.log(`[MaestroAPI] Options provided: ${options ? 'yes' : 'no'}`);

    const request: MaestroRequest = {
      input,
      context: context || {},
      options: options || {}
    };

    const result = await maestroOrchestrator.orchestrate(request);

    console.log(`[MaestroAPI] Orchestration completed successfully`);
    console.log(`[MaestroAPI] Execution path: ${result.executionPath}`);
    console.log(`[MaestroAPI] Total time: ${result.totalTime}ms`);
    console.log(`[MaestroAPI] Confidence: ${result.confidence}`);

    res.json(result);

  } catch (error) {
    console.error('[MaestroAPI] Orchestration failed:', error);
    
    res.status(500).json({
      error: 'Orchestration failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Quick classification endpoint - determine task type and recommended approach
 */
router.post('/classify', async (req, res) => {
  try {
    const { input, context } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Input is required and must be a string'
      });
    }

    // Use the maestro to classify without full execution
    const mockRequest: MaestroRequest = {
      input,
      context: context || {},
      options: { forceTAO: false }
    };

    // Just get classification - we'll expose the internal classification method
    const classification = await (maestroOrchestrator as any).classifyRequest(mockRequest);
    const shouldUseTAO = (maestroOrchestrator as any).shouldUseTAOLoop(classification, mockRequest);

    res.json({
      taskType: classification.taskType,
      complexity: classification.complexity,
      recommendedPath: shouldUseTAO ? 'TAO_LOOP' : 'DIRECT',
      requiresMultiStep: classification.requiresMultiStep,
      domainSpecific: classification.domainSpecific,
      contextDependency: classification.contextDependency,
      reasoning: [
        `Task classified as ${classification.taskType} with ${classification.complexity} complexity`,
        shouldUseTAO ? 'Recommended TAO Loop for comprehensive processing' : 'Direct processing recommended for efficiency'
      ]
    });

  } catch (error) {
    console.error('[MaestroAPI] Classification failed:', error);
    
    res.status(500).json({
      error: 'Classification failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * System status endpoint
 */
router.get('/status', async (req, res) => {
  try {
    res.json({
      status: 'operational',
      services: {
        orchestrator: 'active',
        aiIntegration: 'active',
        intelligentRouting: 'active',
        taskClassifier: 'active'
      },
      capabilities: {
        taoLoop: true,
        directProcessing: true,
        intelligentRouting: true,
        multiModelSupport: true,
        contextAware: true
      },
      supportedTaskTypes: [
        'code', 'analysis', 'planning', 'creative', 'coordination', 'general'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MaestroAPI] Status check failed:', error);
    
    res.status(500).json({
      error: 'Status check failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;