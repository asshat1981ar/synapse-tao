import { storage } from '../storage';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import { promptCacheService } from './promptCacheService';
import type { 
  LearningExperiment, 
  InsertLearningExperiment, 
  LearningResult, 
  InsertLearningResult,
  OptimizationInsight,
  InsertOptimizationInsight
} from '@shared/schema';

export interface ExperimentVariant {
  id: string;
  name: string;
  config: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    promptTemplate?: string;
  };
  traffic: number; // percentage 0-100
}

export interface ExperimentRequest {
  name: string;
  type: 'prompt_optimization' | 'model_selection' | 'parameter_tuning';
  hypothesis: string;
  variants: ExperimentVariant[];
  primaryMetric: 'response_time' | 'quality_score' | 'user_satisfaction';
  secondaryMetrics: string[];
  targetImprovement: number;
  sampleSize: number;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  prompt: string;
  response: string;
  responseTime: number;
  qualityScore?: number;
  userRating?: number;
  success: boolean;
  errorType?: string;
  metadata?: Record<string, any>;
}

export class LearningOptimizer {
  private activeExperiments: Map<string, LearningExperiment> = new Map();

  constructor() {
    this.initializeActiveExperiments();
  }

  /**
   * Initialize active experiments from database
   */
  private async initializeActiveExperiments(): Promise<void> {
    try {
      const experiments = await storage.getActiveLearningExperiments();
      for (const experiment of experiments) {
        this.activeExperiments.set(experiment.id, experiment);
      }
      logger.info('LearningOptimizer', `Loaded ${experiments.length} active experiments`);
    } catch (error) {
      logger.error('LearningOptimizer', `Error loading active experiments: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new learning experiment
   */
  async createExperiment(request: ExperimentRequest): Promise<LearningExperiment> {
    try {
      const experimentData: InsertLearningExperiment = {
        id: nanoid(),
        name: request.name,
        type: request.type,
        status: 'active',
        hypothesis: request.hypothesis,
        variants: request.variants,
        metrics: {
          primary: request.primaryMetric,
          secondary: request.secondaryMetrics
        },
        targetImprovement: request.targetImprovement,
        confidenceLevel: 0.95,
        sampleSize: request.sampleSize,
        currentSamples: 0
      };

      const experiment = await storage.createLearningExperiment(experimentData);
      this.activeExperiments.set(experiment.id, experiment);
      
      logger.info('LearningOptimizer', `Created experiment: ${experiment.name} (${experiment.id})`);
      return experiment;
    } catch (error) {
      logger.error('LearningOptimizer', `Error creating experiment: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Select variant for request based on traffic allocation
   */
  selectVariant(experimentId: string): ExperimentVariant | null {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment || experiment.status !== 'active') {
      return null;
    }

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.traffic;
      if (random <= cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return experiment.variants[0] || null;
  }

  /**
   * Get variant for specific experiment type
   */
  async getExperimentVariant(
    prompt: string, 
    provider: string, 
    model: string
  ): Promise<{ experimentId?: string; variant?: ExperimentVariant; originalConfig: any }> {
    try {
      // Find relevant active experiments
      const relevantExperiments = Array.from(this.activeExperiments.values())
        .filter(exp => {
          if (exp.type === 'model_selection') {
            return exp.variants.some(v => v.config.provider === provider);
          }
          if (exp.type === 'prompt_optimization') {
            return true; // All prompts can be optimized
          }
          if (exp.type === 'parameter_tuning') {
            return exp.variants.some(v => v.config.model === model);
          }
          return false;
        });

      if (relevantExperiments.length === 0) {
        return { originalConfig: { provider, model } };
      }

      // Select first relevant experiment (could be improved with prioritization)
      const experiment = relevantExperiments[0];
      const variant = this.selectVariant(experiment.id);

      if (!variant) {
        return { originalConfig: { provider, model } };
      }

      return {
        experimentId: experiment.id,
        variant,
        originalConfig: { provider, model }
      };
    } catch (error) {
      logger.error('LearningOptimizer', `Error getting experiment variant: ${(error as Error).message}`);
      return { originalConfig: { provider, model } };
    }
  }

  /**
   * Record experiment result
   */
  async recordResult(result: ExperimentResult): Promise<void> {
    try {
      // Generate prompt hash for linking with cache
      const promptHash = require('crypto')
        .createHash('sha256')
        .update(result.prompt)
        .digest('hex');

      const learningResult: InsertLearningResult = {
        id: nanoid(),
        experimentId: result.experimentId,
        variantId: result.variantId,
        promptHash,
        responseTime: result.responseTime,
        qualityScore: result.qualityScore,
        userRating: result.userRating,
        success: result.success,
        errorType: result.errorType,
        metadata: result.metadata
      };

      await storage.createLearningResult(learningResult);
      
      // Check if experiment is complete
      await this.checkExperimentCompletion(result.experimentId);
      
      logger.debug('LearningOptimizer', `Recorded result for experiment ${result.experimentId}, variant ${result.variantId}`);
    } catch (error) {
      logger.error('LearningOptimizer', `Error recording experiment result: ${(error as Error).message}`);
    }
  }

  /**
   * Check if experiment has enough samples and analyze results
   */
  private async checkExperimentCompletion(experimentId: string): Promise<void> {
    try {
      const experiment = this.activeExperiments.get(experimentId);
      if (!experiment) return;

      if (experiment.currentSamples >= experiment.sampleSize) {
        const analysis = await storage.getExperimentAnalysis(experimentId);
        
        if (analysis.significantDifference && analysis.confidence >= experiment.confidenceLevel) {
          // Find winning variant
          const winner = analysis.variants.reduce((best, current) => 
            current.avgQualityScore > best.avgQualityScore ? current : best
          );

          // Complete the experiment
          await storage.updateLearningExperiment(experimentId, {
            status: 'completed',
            completedAt: new Date(),
            winner: winner.id,
            results: analysis
          });

          this.activeExperiments.delete(experimentId);
          
          // Generate optimization insight
          await this.generateOptimizationInsight(experiment, analysis, winner);
          
          logger.info('LearningOptimizer', `Completed experiment ${experiment.name} with winner: ${winner.id}`);
        }
      }
    } catch (error) {
      logger.error('LearningOptimizer', `Error checking experiment completion: ${(error as Error).message}`);
    }
  }

  /**
   * Generate optimization insight from completed experiment
   */
  private async generateOptimizationInsight(
    experiment: LearningExperiment, 
    analysis: any, 
    winner: any
  ): Promise<void> {
    try {
      let insight = '';
      let recommendation = '';
      let impact = 'medium';

      if (experiment.type === 'model_selection') {
        const winnerVariant = experiment.variants.find(v => v.id === winner.id);
        insight = `Model ${winnerVariant?.config.model} outperformed alternatives by ${((winner.avgQualityScore - analysis.variants.find((v: any) => v.id !== winner.id)?.avgQualityScore || 0) * 100).toFixed(1)}% in quality score.`;
        recommendation = `Switch default model to ${winnerVariant?.config.model} for ${experiment.type} tasks.`;
        impact = winner.avgQualityScore > 0.8 ? 'high' : 'medium';
      } else if (experiment.type === 'prompt_optimization') {
        insight = `Optimized prompt template improved response quality by ${(winner.avgQualityScore * 100).toFixed(1)}%.`;
        recommendation = `Adopt the winning prompt template for similar use cases.`;
        impact = winner.avgQualityScore > 0.8 ? 'high' : 'medium';
      } else if (experiment.type === 'parameter_tuning') {
        insight = `Parameter optimization resulted in ${(winner.avgResponseTime / 1000).toFixed(1)}s average response time with ${(winner.avgQualityScore * 100).toFixed(1)}% quality score.`;
        recommendation = `Update default parameters based on winning configuration.`;
        impact = 'medium';
      }

      const optimizationInsight: InsertOptimizationInsight = {
        id: nanoid(),
        type: 'experiment_result',
        category: experiment.metrics.primary === 'response_time' ? 'latency' : 'quality',
        insight,
        confidence: analysis.confidence,
        impact,
        recommendation,
        dataPoints: analysis.variants.reduce((sum: number, v: any) => sum + v.sampleSize, 0),
        evidence: {
          experimentId: experiment.id,
          experimentName: experiment.name,
          winnerVariant: winner,
          analysis
        },
        status: 'new'
      };

      await storage.createOptimizationInsight(optimizationInsight);
      logger.info('LearningOptimizer', `Generated optimization insight from experiment ${experiment.name}`);
    } catch (error) {
      logger.error('LearningOptimizer', `Error generating optimization insight: ${(error as Error).message}`);
    }
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments(): LearningExperiment[] {
    return Array.from(this.activeExperiments.values());
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentId: string): Promise<void> {
    try {
      await storage.updateLearningExperiment(experimentId, { status: 'paused' });
      const experiment = this.activeExperiments.get(experimentId);
      if (experiment) {
        experiment.status = 'paused';
      }
      logger.info('LearningOptimizer', `Paused experiment ${experimentId}`);
    } catch (error) {
      logger.error('LearningOptimizer', `Error pausing experiment: ${(error as Error).message}`);
    }
  }

  /**
   * Resume an experiment
   */
  async resumeExperiment(experimentId: string): Promise<void> {
    try {
      await storage.updateLearningExperiment(experimentId, { status: 'active' });
      const experiment = await storage.getLearningExperiment(experimentId);
      if (experiment) {
        this.activeExperiments.set(experimentId, experiment);
      }
      logger.info('LearningOptimizer', `Resumed experiment ${experimentId}`);
    } catch (error) {
      logger.error('LearningOptimizer', `Error resuming experiment: ${(error as Error).message}`);
    }
  }

  /**
   * Get experiment performance summary
   */
  async getExperimentSummary(): Promise<{
    totalExperiments: number;
    activeExperiments: number;
    completedExperiments: number;
    totalInsights: number;
    recentInsights: OptimizationInsight[];
  }> {
    try {
      const allExperiments = await storage.getAllLearningExperiments();
      const activeExperiments = allExperiments.filter(e => e.status === 'active');
      const completedExperiments = allExperiments.filter(e => e.status === 'completed');
      const allInsights = await storage.getOptimizationInsights();
      const recentInsights = allInsights.slice(0, 5);

      return {
        totalExperiments: allExperiments.length,
        activeExperiments: activeExperiments.length,
        completedExperiments: completedExperiments.length,
        totalInsights: allInsights.length,
        recentInsights
      };
    } catch (error) {
      logger.error('LearningOptimizer', `Error getting experiment summary: ${(error as Error).message}`);
      return {
        totalExperiments: 0,
        activeExperiments: 0,
        completedExperiments: 0,
        totalInsights: 0,
        recentInsights: []
      };
    }
  }
}

// Singleton instance
export const learningOptimizer = new LearningOptimizer();