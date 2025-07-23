/**
 * TAO Loop API Routes - Project Chimera Integration
 * Provides endpoints for Think-Act-Observe workflow execution
 */

import { Router } from 'express';
import { taoLoopService } from '../services/taoLoopService';

const router = Router();

/**
 * Execute TAO Loop workflow (Project Chimera pattern)
 * POST /api/tao/execute
 */
router.post('/execute', async (req, res) => {
  try {
    const { requirements, context, targetAgent, complexity } = req.body;

    if (!requirements) {
      return res.status(400).json({
        error: 'Requirements are required for TAO Loop execution'
      });
    }

    console.log('[TAORoutes] Executing TAO Loop:', {
      requirementsLength: requirements.length,
      context: context ? Object.keys(context) : 'none',
      targetAgent,
      complexity
    });

    const result = await taoLoopService.executeTAOLoop({
      requirements,
      context,
      targetAgent,
      complexity
    });

    res.json({
      success: result.success,
      taskId: result.taskId,
      result: result.finalResult,
      stages: result.stages.map(stage => ({
        stage: stage.stage,
        response: stage.response,
        provider: stage.provider,
        model: stage.model,
        responseTime: stage.responseTime
      })),
      totalTime: result.totalTime,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[TAORoutes] TAO execution error:', error);
    res.status(500).json({
      error: 'Failed to execute TAO Loop',
      details: (error as Error).message
    });
  }
});

/**
 * Classify task and get routing recommendations
 * POST /api/tao/classify
 */
router.post('/classify', async (req, res) => {
  try {
    const { userInput, context } = req.body;

    if (!userInput) {
      return res.status(400).json({
        error: 'User input is required for task classification'
      });
    }

    const classification = await taoLoopService.classifyAndRoute(userInput, context);

    res.json({
      taskType: classification.taskType,
      recommendedAgent: classification.recommendedAgent,
      complexity: classification.complexity,
      shouldUseTAOLoop: classification.shouldUseTAOLoop,
      reasoning: classification.reasoning,
      modelRecommendation: taoLoopService.selectModelForTask(classification.taskType)
    });

  } catch (error) {
    console.error('[TAORoutes] Classification error:', error);
    res.status(500).json({
      error: 'Failed to classify task',
      details: (error as Error).message
    });
  }
});

/**
 * Get TAO Loop execution metrics and history
 * GET /api/tao/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const history = taoLoopService.getExecutionHistory();

    res.json({
      executionHistory: history,
      stageConfiguration: {
        OBSERVE: 'Analyze and understand the current situation',
        THINK: 'Reason about observations and plan approach', 
        ACT: 'Execute the planned approach'
      },
      availableProviders: ['deepseek', 'openai', 'anthropic'],
      chimeraPatterns: {
        codeTasksRoute: 'deepseek-coder',
        mathTasksRoute: 'deepseek-v3',
        observeStage: 'default models',
        thinkStage: 'reasoning models',
        actStage: 'agent models'
      }
    });

  } catch (error) {
    console.error('[TAORoutes] Metrics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve TAO metrics',
      details: (error as Error).message
    });
  }
});

/**
 * Execute single TAO stage (for testing/debugging)
 * POST /api/tao/stage/:stageName
 */
router.post('/stage/:stageName', async (req, res) => {
  try {
    const { stageName } = req.params;
    const { requirements, previousStageOutput, context } = req.body;

    if (!['OBSERVE', 'THINK', 'ACT'].includes(stageName.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid stage name. Must be OBSERVE, THINK, or ACT'
      });
    }

    if (!requirements) {
      return res.status(400).json({
        error: 'Requirements are required for stage execution'
      });
    }

    // This would require exposing the private executeStage method or refactoring
    // For now, return a simulated response
    const modelRecommendation = taoLoopService.selectModelForTask('general', stageName.toUpperCase() as any);

    res.json({
      stage: stageName.toUpperCase(),
      modelRecommendation,
      message: `Single stage execution not yet implemented. Use /execute for full TAO Loop.`
    });

  } catch (error) {
    console.error('[TAORoutes] Stage execution error:', error);
    res.status(500).json({
      error: 'Failed to execute TAO stage',
      details: (error as Error).message
    });
  }
});

export default router;