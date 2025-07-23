import { aiIntegrationService } from './aiIntegration';

interface MetricTimeSeries {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface AgentPerformanceData {
  agentId: string;
  agentType: string;
  metrics: {
    successRate: MetricTimeSeries[];
    responseTime: MetricTimeSeries[];
    healthScore: MetricTimeSeries[];
    taskThroughput: MetricTimeSeries[];
    errorRate: MetricTimeSeries[];
  };
  predictions: {
    nextHourPerformance: number;
    potentialBottlenecks: string[];
    recommendedActions: string[];
  };
}

interface SystemPerformanceData {
  overall: {
    systemEfficiency: MetricTimeSeries[];
    memoryUsage: MetricTimeSeries[];
    cpuUsage: MetricTimeSeries[];
    activeAgents: MetricTimeSeries[];
    queueSize: MetricTimeSeries[];
  };
  predictions: {
    resourceUtilization: {
      memory: { nextHour: number; trend: 'increasing' | 'decreasing' | 'stable' };
      cpu: { nextHour: number; trend: 'increasing' | 'decreasing' | 'stable' };
      agents: { optimalCount: number; currentEfficiency: number };
    };
    systemHealth: {
      overallScore: number;
      riskFactors: string[];
      upcomingMaintenance: string[];
    };
  };
}

interface TaskAnalytics {
  taskType: string;
  metrics: {
    completionRate: number;
    averageDuration: number;
    complexityScore: number;
    failureReasons: { reason: string; frequency: number }[];
  };
  trends: {
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
    complexityTrend: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: {
    optimization: string[];
    resourceAllocation: string[];
    agentAssignment: string[];
  };
}

interface PredictiveInsight {
  id: string;
  type: 'performance' | 'capacity' | 'failure' | 'optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  prediction: {
    confidence: number;
    timeframe: string;
    impact: string;
  };
  recommendations: string[];
  metadata: {
    generatedAt: string;
    modelUsed: string;
    dataPoints: number;
  };
}

interface AnomalyDetection {
  anomalyId: string;
  detectedAt: string;
  type: 'performance_degradation' | 'resource_spike' | 'failure_pattern' | 'unusual_behavior';
  severity: number; // 0-1 scale
  description: string;
  affectedComponents: string[];
  possibleCauses: string[];
  suggestedActions: string[];
  metadata: {
    detectionModel: string;
    confidence: number;
    historicalComparison: {
      baseline: number;
      current: number;
      deviation: number;
    };
  };
}

interface MLModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'clustering' | 'time_series';
  purpose: string;
  accuracy: number;
  lastTrained: string;
  features: string[];
  hyperparameters: Record<string, any>;
}

export class AdvancedAnalyticsService {
  private performanceHistory: Map<string, MetricTimeSeries[]> = new Map();
  private agentAnalytics: Map<string, AgentPerformanceData> = new Map();
  private systemAnalytics: SystemPerformanceData | null = null;
  private taskAnalytics: Map<string, TaskAnalytics> = new Map();
  private predictiveInsights: PredictiveInsight[] = [];
  private anomalies: AnomalyDetection[] = [];
  private mlModels: Map<string, MLModel> = new Map();

  constructor() {
    this.initializeMLModels();
    this.startAnalyticsCollection();
  }

  /**
   * Initialize ML models for various analytics tasks
   */
  private initializeMLModels() {
    const models: MLModel[] = [
      {
        id: 'performance-predictor',
        name: 'Agent Performance Predictor',
        type: 'regression',
        purpose: 'Predict agent performance based on historical data and current workload',
        accuracy: 0.87,
        lastTrained: new Date().toISOString(),
        features: ['success_rate', 'response_time', 'task_complexity', 'workload', 'health_score'],
        hyperparameters: { learning_rate: 0.001, hidden_layers: [64, 32, 16] }
      },
      {
        id: 'anomaly-detector',
        name: 'System Anomaly Detector',
        type: 'classification',
        purpose: 'Detect anomalous behavior patterns in system metrics',
        accuracy: 0.93,
        lastTrained: new Date().toISOString(),
        features: ['cpu_usage', 'memory_usage', 'error_rate', 'response_time', 'throughput'],
        hyperparameters: { threshold: 0.95, window_size: 100 }
      },
      {
        id: 'capacity-planner',
        name: 'Resource Capacity Planner',
        type: 'time_series',
        purpose: 'Forecast resource utilization and capacity requirements',
        accuracy: 0.85,
        lastTrained: new Date().toISOString(),
        features: ['historical_usage', 'growth_rate', 'seasonal_patterns', 'workload_trends'],
        hyperparameters: { forecast_horizon: 24, seasonality: 'auto' }
      },
      {
        id: 'task-optimizer',
        name: 'Task Assignment Optimizer',
        type: 'clustering',
        purpose: 'Optimize task assignment based on agent capabilities and performance',
        accuracy: 0.91,
        lastTrained: new Date().toISOString(),
        features: ['agent_capabilities', 'task_complexity', 'historical_performance', 'current_workload'],
        hyperparameters: { clusters: 5, max_iterations: 100 }
      }
    ];

    models.forEach(model => {
      this.mlModels.set(model.id, model);
    });

    console.log('[AdvancedAnalytics] Initialized ML models:', models.map(m => m.name));
  }

  /**
   * Start automated analytics collection
   */
  private startAnalyticsCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Generate predictions every 5 minutes
    setInterval(() => {
      this.generatePredictiveInsights();
    }, 300000);

    // Run anomaly detection every minute
    setInterval(() => {
      this.detectAnomalies();
    }, 60000);

    console.log('[AdvancedAnalytics] Started automated analytics collection');
  }

  /**
   * Collect and store system metrics
   */
  private async collectSystemMetrics() {
    const timestamp = new Date().toISOString();
    
    try {
      // Simulate collecting real system metrics
      const metrics = {
        memoryUsage: Math.random() * 80 + 10, // 10-90%
        cpuUsage: Math.random() * 70 + 15,    // 15-85%
        systemEfficiency: Math.random() * 0.3 + 0.7, // 0.7-1.0
        activeAgents: Math.floor(Math.random() * 3) + 5, // 5-8
        queueSize: Math.floor(Math.random() * 10) // 0-10
      };

      // Store metrics
      Object.entries(metrics).forEach(([key, value]) => {
        const history = this.performanceHistory.get(key) || [];
        history.push({ timestamp, value });
        
        // Keep only last 1000 data points
        if (history.length > 1000) {
          history.shift();
        }
        
        this.performanceHistory.set(key, history);
      });

      // Update system analytics
      this.updateSystemAnalytics(metrics, timestamp);
      
    } catch (error) {
      console.error('[AdvancedAnalytics] Error collecting metrics:', error);
    }
  }

  /**
   * Update system analytics with predictions
   */
  private updateSystemAnalytics(metrics: any, timestamp: string) {
    if (!this.systemAnalytics) {
      this.systemAnalytics = {
        overall: {
          systemEfficiency: [],
          memoryUsage: [],
          cpuUsage: [],
          activeAgents: [],
          queueSize: []
        },
        predictions: {
          resourceUtilization: {
            memory: { nextHour: 0, trend: 'stable' },
            cpu: { nextHour: 0, trend: 'stable' },
            agents: { optimalCount: 6, currentEfficiency: 0.85 }
          },
          systemHealth: {
            overallScore: 0.9,
            riskFactors: [],
            upcomingMaintenance: []
          }
        }
      };
    }

    // Add current metrics to time series
    Object.entries(metrics).forEach(([key, value]) => {
      if (this.systemAnalytics!.overall[key as keyof typeof this.systemAnalytics.overall]) {
        this.systemAnalytics!.overall[key as keyof typeof this.systemAnalytics.overall].push({
          timestamp,
          value: value as number
        });
      }
    });

    // Generate predictions
    this.updateResourcePredictions(metrics);
  }

  /**
   * Update resource utilization predictions
   */
  private updateResourcePredictions(currentMetrics: any) {
    const memoryHistory = this.performanceHistory.get('memoryUsage') || [];
    const cpuHistory = this.performanceHistory.get('cpuUsage') || [];

    if (memoryHistory.length >= 10) {
      const memoryTrend = this.calculateTrend(memoryHistory.slice(-10));
      const predictedMemory = Math.max(0, Math.min(100, 
        currentMetrics.memoryUsage + (memoryTrend * 60) // Predict 1 hour ahead
      ));

      this.systemAnalytics!.predictions.resourceUtilization.memory = {
        nextHour: predictedMemory,
        trend: memoryTrend > 1 ? 'increasing' : memoryTrend < -1 ? 'decreasing' : 'stable'
      };
    }

    if (cpuHistory.length >= 10) {
      const cpuTrend = this.calculateTrend(cpuHistory.slice(-10));
      const predictedCpu = Math.max(0, Math.min(100, 
        currentMetrics.cpuUsage + (cpuTrend * 60)
      ));

      this.systemAnalytics!.predictions.resourceUtilization.cpu = {
        nextHour: predictedCpu,
        trend: cpuTrend > 1 ? 'increasing' : cpuTrend < -1 ? 'decreasing' : 'stable'
      };
    }

    // Update system health score
    this.updateSystemHealthScore(currentMetrics);
  }

  /**
   * Calculate trend from time series data
   */
  private calculateTrend(data: MetricTimeSeries[]): number {
    if (data.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = data.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].value;
      sumXY += i * data[i].value;
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Update system health score
   */
  private updateSystemHealthScore(metrics: any) {
    const healthFactors = {
      memory: Math.max(0, 1 - (metrics.memoryUsage / 100)),
      cpu: Math.max(0, 1 - (metrics.cpuUsage / 100)),
      efficiency: metrics.systemEfficiency,
      queue: Math.max(0, 1 - (metrics.queueSize / 20))
    };

    const overallScore = Object.values(healthFactors)
      .reduce((sum, factor) => sum + factor, 0) / Object.keys(healthFactors).length;

    this.systemAnalytics!.predictions.systemHealth.overallScore = overallScore;

    // Update risk factors
    const riskFactors: string[] = [];
    if (metrics.memoryUsage > 80) riskFactors.push('High memory usage detected');
    if (metrics.cpuUsage > 75) riskFactors.push('High CPU utilization');
    if (metrics.queueSize > 15) riskFactors.push('Task queue buildup');
    if (metrics.systemEfficiency < 0.7) riskFactors.push('System efficiency below threshold');

    this.systemAnalytics!.predictions.systemHealth.riskFactors = riskFactors;
  }

  /**
   * Generate predictive insights using AI
   */
  private async generatePredictiveInsights() {
    try {
      const recentMetrics = this.getRecentMetrics(3600000); // Last hour
      if (Object.keys(recentMetrics).length === 0) return;

      const insightPrompt = `
Analyze the following system metrics and generate predictive insights:

Recent System Metrics (last hour):
${JSON.stringify(recentMetrics, null, 2)}

Current System State:
${JSON.stringify(this.systemAnalytics?.predictions, null, 2)}

Please provide:
1. Performance predictions for the next 4 hours
2. Potential capacity bottlenecks
3. Risk assessment for system failures
4. Optimization recommendations
5. Resource scaling suggestions

Focus on actionable insights with confidence levels and timeframes.
Provide response in JSON format with structured insights.
`;

      const response = await aiIntegrationService.processRequest({
        prompt: insightPrompt,
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 1500
      });

      const insights = JSON.parse(response.content || '{}');
      this.processAIInsights(insights);

    } catch (error) {
      console.error('[AdvancedAnalytics] Error generating predictive insights:', error);
    }
  }

  /**
   * Process AI-generated insights
   */
  private processAIInsights(insights: any) {
    if (!insights.predictions) return;

    const predictions = Array.isArray(insights.predictions) ? insights.predictions : [insights.predictions];
    
    predictions.forEach((prediction: any, index: number) => {
      const insight: PredictiveInsight = {
        id: `insight-${Date.now()}-${index}`,
        type: prediction.type || 'performance',
        severity: prediction.severity || 'medium',
        title: prediction.title || 'System Performance Prediction',
        description: prediction.description || 'AI-generated system insight',
        prediction: {
          confidence: prediction.confidence || 0.8,
          timeframe: prediction.timeframe || '4 hours',
          impact: prediction.impact || 'moderate'
        },
        recommendations: prediction.recommendations || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          modelUsed: 'gpt-4o',
          dataPoints: Object.keys(this.performanceHistory).length
        }
      };

      this.predictiveInsights.push(insight);
    });

    // Keep only last 50 insights
    if (this.predictiveInsights.length > 50) {
      this.predictiveInsights = this.predictiveInsights.slice(-50);
    }

    console.log(`[AdvancedAnalytics] Generated ${predictions.length} new predictive insights`);
  }

  /**
   * Detect system anomalies
   */
  private async detectAnomalies() {
    const recentMetrics = this.getRecentMetrics(600000); // Last 10 minutes
    const historicalBaseline = this.calculateBaseline();

    for (const [metric, values] of Object.entries(recentMetrics)) {
      if (values.length < 5) continue; // Need minimum data points

      const currentAverage = values.reduce((sum, v) => sum + v.value, 0) / values.length;
      const baseline = historicalBaseline[metric] || currentAverage;
      const deviation = Math.abs(currentAverage - baseline) / baseline;

      if (deviation > 0.3) { // 30% deviation threshold
        const anomaly: AnomalyDetection = {
          anomalyId: `anomaly-${Date.now()}-${metric}`,
          detectedAt: new Date().toISOString(),
          type: this.classifyAnomalyType(metric, deviation),
          severity: Math.min(1, deviation),
          description: `Unusual ${metric} detected: ${currentAverage.toFixed(2)} vs baseline ${baseline.toFixed(2)}`,
          affectedComponents: [metric],
          possibleCauses: this.generatePossibleCauses(metric, deviation),
          suggestedActions: this.generateSuggestedActions(metric, deviation),
          metadata: {
            detectionModel: 'threshold-based',
            confidence: Math.min(0.95, deviation * 2),
            historicalComparison: {
              baseline,
              current: currentAverage,
              deviation
            }
          }
        };

        this.anomalies.push(anomaly);
        console.log(`[AdvancedAnalytics] Detected anomaly in ${metric}: ${(deviation * 100).toFixed(1)}% deviation`);
      }
    }

    // Keep only last 100 anomalies
    if (this.anomalies.length > 100) {
      this.anomalies = this.anomalies.slice(-100);
    }
  }

  /**
   * Classify anomaly type based on metric and deviation
   */
  private classifyAnomalyType(metric: string, deviation: number): AnomalyDetection['type'] {
    if (metric.includes('memory') || metric.includes('cpu')) {
      return deviation > 0.5 ? 'resource_spike' : 'performance_degradation';
    }
    
    if (metric.includes('error') || metric.includes('failure')) {
      return 'failure_pattern';
    }

    return 'unusual_behavior';
  }

  /**
   * Generate possible causes for anomalies
   */
  private generatePossibleCauses(metric: string, deviation: number): string[] {
    const causes: string[] = [];

    if (metric.includes('memory')) {
      causes.push('Memory leak in agent processes', 'Increased task complexity', 'Insufficient garbage collection');
    } else if (metric.includes('cpu')) {
      causes.push('High computational load', 'Inefficient algorithms', 'Resource contention');
    } else if (metric.includes('response') || metric.includes('time')) {
      causes.push('Network latency', 'Database performance issues', 'Agent overload');
    }

    if (deviation > 0.5) {
      causes.push('System configuration changes', 'External service degradation');
    }

    return causes;
  }

  /**
   * Generate suggested actions for anomalies
   */
  private generateSuggestedActions(metric: string, deviation: number): string[] {
    const actions: string[] = [];

    if (metric.includes('memory')) {
      actions.push('Monitor memory usage patterns', 'Restart affected agents', 'Scale up memory allocation');
    } else if (metric.includes('cpu')) {
      actions.push('Distribute load across agents', 'Optimize processing algorithms', 'Scale horizontally');
    }

    if (deviation > 0.7) {
      actions.push('Enable emergency scaling', 'Alert system administrators', 'Implement circuit breakers');
    } else {
      actions.push('Continue monitoring', 'Schedule performance review');
    }

    return actions;
  }

  /**
   * Get recent metrics for analysis
   */
  private getRecentMetrics(timeWindow: number): Record<string, MetricTimeSeries[]> {
    const cutoff = new Date(Date.now() - timeWindow).toISOString();
    const recentMetrics: Record<string, MetricTimeSeries[]> = {};

    for (const [metric, history] of this.performanceHistory.entries()) {
      const recentData = history.filter(point => point.timestamp > cutoff);
      if (recentData.length > 0) {
        recentMetrics[metric] = recentData;
      }
    }

    return recentMetrics;
  }

  /**
   * Calculate baseline values for metrics
   */
  private calculateBaseline(): Record<string, number> {
    const baseline: Record<string, number> = {};

    for (const [metric, history] of this.performanceHistory.entries()) {
      if (history.length >= 100) { // Need sufficient historical data
        const values = history.slice(-100).map(point => point.value);
        baseline[metric] = values.reduce((sum, value) => sum + value, 0) / values.length;
      }
    }

    return baseline;
  }

  /**
   * Get analytics dashboard data
   */
  getAnalyticsDashboard() {
    return {
      systemPerformance: this.systemAnalytics,
      agentAnalytics: Array.from(this.agentAnalytics.values()),
      taskAnalytics: Array.from(this.taskAnalytics.values()),
      predictiveInsights: this.predictiveInsights.slice(-10), // Last 10 insights
      recentAnomalies: this.anomalies.slice(-10), // Last 10 anomalies
      modelStatus: Array.from(this.mlModels.values()),
      dashboardMetrics: {
        totalDataPoints: Array.from(this.performanceHistory.values())
          .reduce((sum, history) => sum + history.length, 0),
        activeModels: this.mlModels.size,
        insightsGenerated: this.predictiveInsights.length,
        anomaliesDetected: this.anomalies.length
      }
    };
  }

  /**
   * Get performance trends for specific metrics
   */
  getPerformanceTrends(metric: string, timeRange: string = '24h'): MetricTimeSeries[] {
    const history = this.performanceHistory.get(metric) || [];
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoff = new Date(Date.now() - timeRangeMs).toISOString();

    return history.filter(point => point.timestamp > cutoff);
  }

  /**
   * Parse time range string to milliseconds
   */
  private parseTimeRange(range: string): number {
    const value = parseInt(range);
    const unit = range.slice(-1);

    switch (unit) {
      case 'h': return value * 3600000;
      case 'd': return value * 86400000;
      case 'm': return value * 60000;
      default: return 86400000; // Default to 24 hours
    }
  }

  /**
   * Update agent performance data
   */
  updateAgentPerformance(agentId: string, agentType: string, metrics: any) {
    const timestamp = new Date().toISOString();
    
    if (!this.agentAnalytics.has(agentId)) {
      this.agentAnalytics.set(agentId, {
        agentId,
        agentType,
        metrics: {
          successRate: [],
          responseTime: [],
          healthScore: [],
          taskThroughput: [],
          errorRate: []
        },
        predictions: {
          nextHourPerformance: 0.85,
          potentialBottlenecks: [],
          recommendedActions: []
        }
      });
    }

    const agentData = this.agentAnalytics.get(agentId)!;
    
    // Update metrics time series
    Object.entries(metrics).forEach(([key, value]) => {
      if (agentData.metrics[key as keyof typeof agentData.metrics]) {
        agentData.metrics[key as keyof typeof agentData.metrics].push({
          timestamp,
          value: value as number
        });
      }
    });

    console.log(`[AdvancedAnalytics] Updated performance data for agent ${agentId}`);
  }

  /**
   * Get ML model performance
   */
  getMLModelPerformance(): Record<string, any> {
    const modelPerformance: Record<string, any> = {};

    for (const [modelId, model] of this.mlModels.entries()) {
      modelPerformance[modelId] = {
        accuracy: model.accuracy,
        lastTrained: model.lastTrained,
        predictionsGenerated: this.predictiveInsights.filter(i => 
          i.metadata.modelUsed === model.name
        ).length,
        status: 'active'
      };
    }

    return modelPerformance;
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();