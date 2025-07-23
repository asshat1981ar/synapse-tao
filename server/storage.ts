import {
  agents,
  tasks,
  mcpServers,
  systemMetrics,
  alerts,
  systemLogs,
  aiProviderConfigs,
  promptCache,
  learningExperiments,
  learningResults,
  optimizationInsights,
  type Agent,
  type InsertAgent,
  type Task,
  type InsertTask,
  type McpServer,
  type InsertMcpServer,
  type SystemMetrics,
  type InsertSystemMetrics,
  type Alert,
  type InsertAlert,
  type SystemLog,
  type InsertSystemLog,
  type AiProviderConfig,
  type InsertAiProviderConfig,
  type PromptCache,
  type InsertPromptCache,
  type LearningExperiment,
  type InsertLearningExperiment,
  type LearningResult,
  type InsertLearningResult,
  type OptimizationInsight,
  type InsertOptimizationInsight
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, count, avg, sum } from "drizzle-orm";
import { createHash } from "crypto";

export interface IStorage {
  // Agent operations
  getAgent(id: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent>;
  updateAgentHeartbeat(id: string): Promise<void>;

  // Task operations
  getTask(id: string): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByStatus(status: string): Promise<Task[]>;
  getTasksByAgent(agentId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  assignTask(taskId: string, agentId: string): Promise<Task>;

  // MCP Server operations
  getMcpServer(id: string): Promise<McpServer | undefined>;
  getAllMcpServers(): Promise<McpServer[]>;
  getMcpServersByStatus(status: string): Promise<McpServer[]>;
  createMcpServer(server: InsertMcpServer): Promise<McpServer>;
  updateMcpServer(id: string, updates: Partial<InsertMcpServer>): Promise<McpServer>;

  // System Metrics operations
  getLatestSystemMetrics(): Promise<SystemMetrics | undefined>;
  getSystemMetricsHistory(limit: number): Promise<SystemMetrics[]>;
  createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;

  // Alert operations
  getAllAlerts(): Promise<Alert[]>;
  getUnacknowledgedAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: string): Promise<Alert>;

  // System Log operations
  getSystemLogs(limit: number, level?: string): Promise<SystemLog[]>;
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;

  // AI Provider Config operations
  getAiProviderConfigs(): Promise<AiProviderConfig[]>;
  getActiveAiProviderConfigs(): Promise<AiProviderConfig[]>;
  createAiProviderConfig(config: InsertAiProviderConfig): Promise<AiProviderConfig>;
  updateAiProviderConfig(id: string, updates: Partial<InsertAiProviderConfig>): Promise<AiProviderConfig>;

  // Prompt Cache operations
  getCachedPrompt(promptHash: string): Promise<PromptCache | undefined>;
  setCachedPrompt(cache: InsertPromptCache): Promise<PromptCache>;
  updateCacheUsage(promptHash: string): Promise<void>;
  cleanupExpiredCache(): Promise<number>;
  getCacheStats(): Promise<{ totalEntries: number; hitRate: number; avgResponseTime: number }>;

  // Learning Experiment operations
  getLearningExperiment(id: string): Promise<LearningExperiment | undefined>;
  getAllLearningExperiments(): Promise<LearningExperiment[]>;
  getActiveLearningExperiments(): Promise<LearningExperiment[]>;
  createLearningExperiment(experiment: InsertLearningExperiment): Promise<LearningExperiment>;
  updateLearningExperiment(id: string, updates: Partial<InsertLearningExperiment>): Promise<LearningExperiment>;

  // Learning Result operations
  createLearningResult(result: InsertLearningResult): Promise<LearningResult>;
  getLearningResultsByExperiment(experimentId: string): Promise<LearningResult[]>;
  getExperimentAnalysis(experimentId: string): Promise<{
    variants: Array<{ id: string; sampleSize: number; avgResponseTime: number; avgQualityScore: number; successRate: number }>;
    confidence: number;
    significantDifference: boolean;
  }>;

  // Optimization Insight operations
  getOptimizationInsights(category?: string): Promise<OptimizationInsight[]>;
  createOptimizationInsight(insight: InsertOptimizationInsight): Promise<OptimizationInsight>;
  updateOptimizationInsight(id: string, updates: Partial<InsertOptimizationInsight>): Promise<OptimizationInsight>;
  getActionableInsights(): Promise<OptimizationInsight[]>;
}

export class DatabaseStorage implements IStorage {
  // Agent operations
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db.insert(agents).values(agent).returning();
    return newAgent;
  }

  async updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent> {
    const [updatedAgent] = await db
      .update(agents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent;
  }

  async updateAgentHeartbeat(id: string): Promise<void> {
    await db
      .update(agents)
      .set({ lastHeartbeat: new Date() })
      .where(eq(agents.id, id));
  }

  // Task operations
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.status, status));
  }

  async getTasksByAgent(agentId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assignedAgent, agentId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async assignTask(taskId: string, agentId: string): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ assignedAgent: agentId, status: "running", updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return updatedTask;
  }

  // MCP Server operations
  async getMcpServer(id: string): Promise<McpServer | undefined> {
    const [server] = await db.select().from(mcpServers).where(eq(mcpServers.id, id));
    return server;
  }

  async getAllMcpServers(): Promise<McpServer[]> {
    return await db.select().from(mcpServers);
  }

  async getMcpServersByStatus(status: string): Promise<McpServer[]> {
    return await db.select().from(mcpServers).where(eq(mcpServers.status, status));
  }

  async createMcpServer(server: InsertMcpServer): Promise<McpServer> {
    const [newServer] = await db.insert(mcpServers).values(server).returning();
    return newServer;
  }

  async updateMcpServer(id: string, updates: Partial<InsertMcpServer>): Promise<McpServer> {
    const [updatedServer] = await db
      .update(mcpServers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mcpServers.id, id))
      .returning();
    return updatedServer;
  }

  // System Metrics operations
  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(systemMetrics)
      .orderBy(desc(systemMetrics.timestamp))
      .limit(1);
    return metrics;
  }

  async getSystemMetricsHistory(limit: number): Promise<SystemMetrics[]> {
    return await db
      .select()
      .from(systemMetrics)
      .orderBy(desc(systemMetrics.timestamp))
      .limit(limit);
  }

  async createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const [newMetrics] = await db.insert(systemMetrics).values(metrics).returning();
    return newMetrics;
  }

  // Alert operations
  async getAllAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getUnacknowledgedAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.acknowledged, false))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async acknowledgeAlert(id: string): Promise<Alert> {
    const [updatedAlert] = await db
      .update(alerts)
      .set({ acknowledged: true })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  // System Log operations
  async getSystemLogs(limit: number, level?: string): Promise<SystemLog[]> {
    let query = db.select().from(systemLogs);
    
    if (level) {
      query = query.where(eq(systemLogs.level, level));
    }
    
    return await query.orderBy(desc(systemLogs.timestamp)).limit(limit);
  }

  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const [newLog] = await db.insert(systemLogs).values(log).returning();
    return newLog;
  }

  // AI Provider Config operations
  async getAiProviderConfigs(): Promise<AiProviderConfig[]> {
    return await db.select().from(aiProviderConfigs);
  }

  async getActiveAiProviderConfigs(): Promise<AiProviderConfig[]> {
    return await db
      .select()
      .from(aiProviderConfigs)
      .where(eq(aiProviderConfigs.isActive, true));
  }

  async createAiProviderConfig(config: InsertAiProviderConfig): Promise<AiProviderConfig> {
    const [newConfig] = await db.insert(aiProviderConfigs).values(config).returning();
    return newConfig;
  }

  async updateAiProviderConfig(id: string, updates: Partial<InsertAiProviderConfig>): Promise<AiProviderConfig> {
    const [updatedConfig] = await db
      .update(aiProviderConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiProviderConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  // Prompt Cache operations
  async getCachedPrompt(promptHash: string): Promise<PromptCache | undefined> {
    const [cached] = await db
      .select()
      .from(promptCache)
      .where(and(
        eq(promptCache.promptHash, promptHash),
        gte(promptCache.expiresAt, new Date())
      ));
    
    if (cached) {
      // Update usage tracking
      await this.updateCacheUsage(promptHash);
    }
    
    return cached;
  }

  async setCachedPrompt(cache: InsertPromptCache): Promise<PromptCache> {
    // Generate hash if not provided
    if (!cache.promptHash) {
      cache.promptHash = createHash('sha256').update(cache.prompt).digest('hex');
    }
    
    // Set expiration if not provided (default 24 hours)
    if (!cache.expiresAt) {
      cache.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const [newCache] = await db
      .insert(promptCache)
      .values(cache)
      .onConflictDoUpdate({
        target: promptCache.promptHash,
        set: {
          response: cache.response,
          responseTokens: cache.responseTokens,
          promptTokens: cache.promptTokens,
          responseTime: cache.responseTime,
          qualityScore: cache.qualityScore,
          usageCount: sql`${promptCache.usageCount} + 1`,
          lastUsed: new Date(),
          updatedAt: new Date()
        }
      })
      .returning();
    
    return newCache;
  }

  async updateCacheUsage(promptHash: string): Promise<void> {
    await db
      .update(promptCache)
      .set({
        usageCount: sql`${promptCache.usageCount} + 1`,
        lastUsed: new Date(),
        updatedAt: new Date()
      })
      .where(eq(promptCache.promptHash, promptHash));
  }

  async cleanupExpiredCache(): Promise<number> {
    const result = await db
      .delete(promptCache)
      .where(gte(new Date(), promptCache.expiresAt))
      .returning({ id: promptCache.id });
    
    return result.length;
  }

  async getCacheStats(): Promise<{ totalEntries: number; hitRate: number; avgResponseTime: number }> {
    const [stats] = await db
      .select({
        totalEntries: count(promptCache.id),
        avgResponseTime: avg(promptCache.responseTime),
        totalUsage: sum(promptCache.usageCount)
      })
      .from(promptCache);

    // Calculate hit rate based on usage patterns
    const hitRate = stats.totalUsage && stats.totalEntries 
      ? Math.min((stats.totalUsage - stats.totalEntries) / stats.totalUsage, 1)
      : 0;

    return {
      totalEntries: stats.totalEntries || 0,
      hitRate: hitRate || 0,
      avgResponseTime: stats.avgResponseTime || 0
    };
  }

  // Learning Experiment operations
  async getLearningExperiment(id: string): Promise<LearningExperiment | undefined> {
    const [experiment] = await db
      .select()
      .from(learningExperiments)
      .where(eq(learningExperiments.id, id));
    return experiment;
  }

  async getAllLearningExperiments(): Promise<LearningExperiment[]> {
    return await db
      .select()
      .from(learningExperiments)
      .orderBy(desc(learningExperiments.createdAt));
  }

  async getActiveLearningExperiments(): Promise<LearningExperiment[]> {
    return await db
      .select()
      .from(learningExperiments)
      .where(eq(learningExperiments.status, 'active'))
      .orderBy(desc(learningExperiments.createdAt));
  }

  async createLearningExperiment(experiment: InsertLearningExperiment): Promise<LearningExperiment> {
    const [newExperiment] = await db
      .insert(learningExperiments)
      .values(experiment)
      .returning();
    return newExperiment;
  }

  async updateLearningExperiment(id: string, updates: Partial<InsertLearningExperiment>): Promise<LearningExperiment> {
    const [updatedExperiment] = await db
      .update(learningExperiments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(learningExperiments.id, id))
      .returning();
    return updatedExperiment;
  }

  // Learning Result operations
  async createLearningResult(result: InsertLearningResult): Promise<LearningResult> {
    const [newResult] = await db
      .insert(learningResults)
      .values(result)
      .returning();
    
    // Update experiment current samples
    await db
      .update(learningExperiments)
      .set({
        currentSamples: sql`${learningExperiments.currentSamples} + 1`,
        updatedAt: new Date()
      })
      .where(eq(learningExperiments.id, result.experimentId));
    
    return newResult;
  }

  async getLearningResultsByExperiment(experimentId: string): Promise<LearningResult[]> {
    return await db
      .select()
      .from(learningResults)
      .where(eq(learningResults.experimentId, experimentId))
      .orderBy(desc(learningResults.timestamp));
  }

  async getExperimentAnalysis(experimentId: string): Promise<{
    variants: Array<{ id: string; sampleSize: number; avgResponseTime: number; avgQualityScore: number; successRate: number }>;
    confidence: number;
    significantDifference: boolean;
  }> {
    const results = await db
      .select({
        variantId: learningResults.variantId,
        sampleSize: count(learningResults.id),
        avgResponseTime: avg(learningResults.responseTime),
        avgQualityScore: avg(learningResults.qualityScore),
        successRate: avg(sql<number>`CASE WHEN ${learningResults.success} THEN 1.0 ELSE 0.0 END`)
      })
      .from(learningResults)
      .where(eq(learningResults.experimentId, experimentId))
      .groupBy(learningResults.variantId);

    // Simple statistical analysis
    const variants = results.map(r => ({
      id: r.variantId,
      sampleSize: r.sampleSize || 0,
      avgResponseTime: r.avgResponseTime || 0,
      avgQualityScore: r.avgQualityScore || 0,
      successRate: r.successRate || 0
    }));

    // Calculate confidence and significance (simplified)
    const totalSamples = variants.reduce((sum, v) => sum + v.sampleSize, 0);
    const confidence = Math.min(totalSamples / 100, 0.95); // Simple confidence metric
    const significantDifference = variants.length > 1 && 
      Math.max(...variants.map(v => v.avgQualityScore)) - 
      Math.min(...variants.map(v => v.avgQualityScore)) > 0.1;

    return {
      variants,
      confidence,
      significantDifference
    };
  }

  // Optimization Insight operations
  async getOptimizationInsights(category?: string): Promise<OptimizationInsight[]> {
    const query = db.select().from(optimizationInsights);
    
    if (category) {
      query.where(eq(optimizationInsights.category, category));
    }
    
    return await query.orderBy(desc(optimizationInsights.createdAt));
  }

  async createOptimizationInsight(insight: InsertOptimizationInsight): Promise<OptimizationInsight> {
    const [newInsight] = await db
      .insert(optimizationInsights)
      .values(insight)
      .returning();
    return newInsight;
  }

  async updateOptimizationInsight(id: string, updates: Partial<InsertOptimizationInsight>): Promise<OptimizationInsight> {
    const [updatedInsight] = await db
      .update(optimizationInsights)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(optimizationInsights.id, id))
      .returning();
    return updatedInsight;
  }

  async getActionableInsights(): Promise<OptimizationInsight[]> {
    return await db
      .select()
      .from(optimizationInsights)
      .where(and(
        eq(optimizationInsights.status, 'new'),
        gte(optimizationInsights.confidence, 0.7)
      ))
      .orderBy(desc(optimizationInsights.confidence));
  }
}

export const storage = new DatabaseStorage();
