import { Router } from 'express';
import { codebaseOptimizer } from '../services/codebaseOptimizer.js';

const router = Router();

/**
 * Run TAO loop optimization on the codebase
 */
router.post('/analyze', async (req, res) => {
  try {
    console.log('[OptimizerAPI] Starting codebase analysis and optimization');
    
    const result = await codebaseOptimizer.optimizeCodebase();
    
    console.log(`[OptimizerAPI] Analysis complete - Health Score: ${result.overallHealth}%`);
    
    res.json({
      success: true,
      analysis: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OptimizerAPI] Optimization failed:', error);
    
    res.status(500).json({
      error: 'Optimization failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get optimization recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const quickAnalysis = await codebaseOptimizer.optimizeCodebase();
    
    res.json({
      recommendations: quickAnalysis.recommendations,
      healthScore: quickAnalysis.overallHealth,
      criticalIssues: quickAnalysis.issues.filter(i => i.severity === 'high')
    });

  } catch (error) {
    console.error('[OptimizerAPI] Failed to get recommendations:', error);
    
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: (error as Error).message
    });
  }
});

export default router;