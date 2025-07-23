import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Agents table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'maestro', 'ai-integration', 'mcp-management', 'project', 'auth', 'cognitive-refiner'
  status: varchar("status").notNull().default("idle"), // 'idle', 'busy', 'offline', 'error'
  healthScore: real("health_score").notNull().default(1.0),
  successRate: real("success_rate").notNull().default(1.0),
  averageResponseTime: real("average_response_time").notNull().default(0),
  totalTasks: integer("total_tasks").notNull().default(0),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  currentTasks: jsonb("current_tasks").$type<string[]>().notNull().default([]),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey(),
  type: varchar("type").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed'
  priority: integer("priority").notNull().default(5),
  description: text("description").notNull(),
  assignedAgent: varchar("assigned_agent").references(() => agents.id),
  progress: integer("progress").notNull().default(0),
  qualityScore: real("quality_score"),
  executionTime: integer("execution_time"),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow()
});

// MCP Servers table
export const mcpServers = pgTable("mcp_servers", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  path: text("path").notNull(),
  runtime: varchar("runtime").notNull(), // 'python', 'node', 'docker'
  framework: varchar("framework"), // 'flask', 'express', 'fastapi'
  status: varchar("status").notNull().default("discovered"), // 'discovered', 'building', 'deployed', 'failed'
  port: integer("port"),
  dockerImage: varchar("docker_image"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// System Metrics table
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  uptime: integer("uptime").notNull(),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksFailed: integer("tasks_failed").notNull().default(0),
  averageResponseTime: real("average_response_time").notNull().default(0),
  systemEfficiency: real("system_efficiency").notNull().default(1.0),
  memoryUsage: real("memory_usage").notNull().default(0),
  cpuUsage: real("cpu_usage").notNull().default(0),
  activeAgents: integer("active_agents").notNull().default(0),
  queueSize: integer("queue_size").notNull().default(0),
  timestamp: timestamp("timestamp").defaultNow()
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey(),
  type: varchar("type").notNull(), // 'info', 'warning', 'error', 'success'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// System Logs table
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: varchar("level").notNull(), // 'info', 'warning', 'error', 'debug'
  service: varchar("service").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow()
});

// AI Provider Configs table
export const aiProviderConfigs = pgTable("ai_provider_configs", {
  id: varchar("id").primaryKey(),
  provider: varchar("provider").notNull(), // 'openai', 'anthropic', 'google', 'blackboxai'
  model: varchar("model").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Prompt Cache table for intelligent caching and optimization
export const promptCache = pgTable("prompt_cache", {
  id: varchar("id").primaryKey(),
  promptHash: varchar("prompt_hash").notNull().unique(), // SHA-256 hash of normalized prompt
  prompt: text("prompt").notNull(),
  provider: varchar("provider").notNull(),
  model: varchar("model").notNull(),
  response: text("response").notNull(),
  responseTokens: integer("response_tokens").notNull().default(0),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  responseTime: integer("response_time").notNull(), // milliseconds
  qualityScore: real("quality_score").default(0.0), // AI-evaluated quality score
  usageCount: integer("usage_count").notNull().default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  expiresAt: timestamp("expires_at"), // TTL for cache invalidation
  metadata: jsonb("metadata"), // Additional context, user preferences, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Learning Loop Experiments for A/B testing and optimization
export const learningExperiments = pgTable("learning_experiments", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'prompt_optimization', 'model_selection', 'parameter_tuning'
  status: varchar("status").notNull().default("active"), // 'active', 'paused', 'completed', 'archived'
  hypothesis: text("hypothesis").notNull(),
  variants: jsonb("variants").$type<Array<{
    id: string;
    name: string;
    config: Record<string, any>;
    traffic: number; // percentage 0-100
  }>>().notNull(),
  metrics: jsonb("metrics").$type<{
    primary: string; // 'response_time', 'quality_score', 'user_satisfaction'
    secondary: string[];
  }>().notNull(),
  targetImprovement: real("target_improvement").notNull().default(0.1), // 10% improvement
  confidenceLevel: real("confidence_level").notNull().default(0.95),
  sampleSize: integer("sample_size").notNull().default(100),
  currentSamples: integer("current_samples").notNull().default(0),
  results: jsonb("results"), // Statistical analysis results
  winner: varchar("winner"), // winning variant ID
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Learning Loop Results for tracking experiment outcomes
export const learningResults = pgTable("learning_results", {
  id: varchar("id").primaryKey(),
  experimentId: varchar("experiment_id").notNull().references(() => learningExperiments.id),
  variantId: varchar("variant_id").notNull(),
  promptHash: varchar("prompt_hash").references(() => promptCache.promptHash),
  responseTime: integer("response_time").notNull(),
  qualityScore: real("quality_score"),
  userRating: integer("user_rating"), // 1-5 user satisfaction
  success: boolean("success").notNull(),
  errorType: varchar("error_type"), // if success = false
  metadata: jsonb("metadata"), // Context about the test
  timestamp: timestamp("timestamp").defaultNow()
});

// Optimization Insights for continuous learning
export const optimizationInsights = pgTable("optimization_insights", {
  id: varchar("id").primaryKey(),
  type: varchar("type").notNull(), // 'prompt_pattern', 'model_performance', 'user_behavior'
  category: varchar("category").notNull(), // 'performance', 'quality', 'cost', 'latency'
  insight: text("insight").notNull(),
  confidence: real("confidence").notNull().default(0.0), // 0.0 - 1.0
  impact: varchar("impact").notNull(), // 'low', 'medium', 'high', 'critical'
  recommendation: text("recommendation"),
  dataPoints: integer("data_points").notNull().default(0),
  evidence: jsonb("evidence"), // Supporting data and analysis
  status: varchar("status").notNull().default("new"), // 'new', 'reviewing', 'approved', 'implemented', 'rejected'
  implementedAt: timestamp("implemented_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Create insert schemas
export const insertAgentSchema = createInsertSchema(agents);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertMcpServerSchema = createInsertSchema(mcpServers);
export const insertSystemMetricsSchema = createInsertSchema(systemMetrics);
export const insertAlertSchema = createInsertSchema(alerts);
export const insertSystemLogSchema = createInsertSchema(systemLogs);
export const insertAiProviderConfigSchema = createInsertSchema(aiProviderConfigs);
export const insertPromptCacheSchema = createInsertSchema(promptCache);
export const insertLearningExperimentSchema = createInsertSchema(learningExperiments);
export const insertLearningResultSchema = createInsertSchema(learningResults);
export const insertOptimizationInsightSchema = createInsertSchema(optimizationInsights);

// Types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type McpServer = typeof mcpServers.$inferSelect;
export type InsertMcpServer = z.infer<typeof insertMcpServerSchema>;

export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

export type AiProviderConfig = typeof aiProviderConfigs.$inferSelect;
export type InsertAiProviderConfig = z.infer<typeof insertAiProviderConfigSchema>;

export type PromptCache = typeof promptCache.$inferSelect;
export type InsertPromptCache = z.infer<typeof insertPromptCacheSchema>;

export type LearningExperiment = typeof learningExperiments.$inferSelect;
export type InsertLearningExperiment = z.infer<typeof insertLearningExperimentSchema>;

export type LearningResult = typeof learningResults.$inferSelect;
export type InsertLearningResult = z.infer<typeof insertLearningResultSchema>;

export type OptimizationInsight = typeof optimizationInsights.$inferSelect;
export type InsertOptimizationInsight = z.infer<typeof insertOptimizationInsightSchema>;
