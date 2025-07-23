import { Router } from 'express';
import { huggingfaceClient } from '../services/huggingfaceClient';
import { huggingfaceEnhancer } from '../services/huggingfaceEnhancer';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { cacheMiddleware } from '../middleware/requestCache';
import { logger } from '../utils/logger';

const router = Router();

// Search HuggingFace models
router.get('/models/search', cacheMiddleware({ ttl: 300000 }), asyncHandler(async (req, res) => {
  const { search, filter, sort, direction, limit = 20, pipeline_tag, library } = req.query;
  
  const searchParams = {
    search: search as string,
    filter: filter as string,
    sort: sort as 'downloads' | 'likes' | 'trending' | 'lastModified',
    direction: direction as 'asc' | 'desc',
    limit: parseInt(limit as string),
    pipeline_tag: pipeline_tag as string,
    library: library as string
  };
  
  const models = await huggingfaceClient.searchModels(searchParams);
  
  res.json({
    success: true,
    models,
    count: models.length,
    message: `Found ${models.length} HuggingFace models`
  });
}));

// Get model information
router.get('/models/:modelId', cacheMiddleware({ ttl: 600000 }), asyncHandler(async (req, res) => {
  const modelId = decodeURIComponent(req.params.modelId);
  
  if (!modelId) {
    throw createError('Model ID is required', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const modelInfo = await huggingfaceClient.getModelInfo(modelId);
  
  res.json({
    success: true,
    model: modelInfo,
    message: `Retrieved model info for: ${modelId}`
  });
}));

// Get recommended models for a task
router.get('/models/recommendations/:taskType', cacheMiddleware({ ttl: 300000 }), asyncHandler(async (req, res) => {
  const { taskType } = req.params;
  const { limit = 10 } = req.query;
  
  const models = await huggingfaceClient.getRecommendedModels(taskType, parseInt(limit as string));
  
  res.json({
    success: true,
    models,
    taskType,
    count: models.length,
    message: `Found ${models.length} recommended models for ${taskType}`
  });
}));

// Search HuggingFace datasets
router.get('/datasets/search', cacheMiddleware({ ttl: 300000 }), asyncHandler(async (req, res) => {
  const { search, filter, sort, limit = 20 } = req.query;
  
  const searchParams = {
    search: search as string,
    filter: filter as string,
    sort: sort as 'downloads' | 'likes' | 'trending' | 'lastModified',
    limit: parseInt(limit as string)
  };
  
  const datasets = await huggingfaceClient.searchDatasets(searchParams);
  
  res.json({
    success: true,
    datasets,
    count: datasets.length,
    message: `Found ${datasets.length} HuggingFace datasets`
  });
}));

// Text generation endpoint
router.post('/inference/text-generation', asyncHandler(async (req, res) => {
  const { modelId, inputs, parameters } = req.body;
  
  if (!modelId || !inputs) {
    throw createError('Missing required fields: modelId, inputs', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceClient.generateText(modelId, { inputs, parameters });
  
  res.json({
    success: true,
    result,
    modelId,
    message: 'Text generation completed successfully'
  });
}));

// Embeddings generation endpoint
router.post('/inference/embeddings', asyncHandler(async (req, res) => {
  const { modelId, inputs, options } = req.body;
  
  if (!modelId || !inputs) {
    throw createError('Missing required fields: modelId, inputs', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const embeddings = await huggingfaceClient.generateEmbeddings(modelId, { inputs, options });
  
  res.json({
    success: true,
    embeddings,
    modelId,
    dimensions: Array.isArray(embeddings[0]) ? embeddings[0].length : embeddings.length,
    message: 'Embeddings generation completed successfully'
  });
}));

// Text classification endpoint
router.post('/inference/classification', asyncHandler(async (req, res) => {
  const { modelId, inputs, parameters } = req.body;
  
  if (!modelId || !inputs) {
    throw createError('Missing required fields: modelId, inputs', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceClient.classifyText(modelId, { inputs, parameters });
  
  res.json({
    success: true,
    result,
    modelId,
    message: 'Text classification completed successfully'
  });
}));

// Summarization endpoint
router.post('/inference/summarization', asyncHandler(async (req, res) => {
  const { modelId, inputs, parameters } = req.body;
  
  if (!modelId || !inputs) {
    throw createError('Missing required fields: modelId, inputs', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceClient.summarizeText(modelId, { inputs, parameters });
  
  res.json({
    success: true,
    result,
    modelId,
    message: 'Text summarization completed successfully'
  });
}));

// Translation endpoint
router.post('/inference/translation', asyncHandler(async (req, res) => {
  const { modelId, inputs, parameters } = req.body;
  
  if (!modelId || !inputs) {
    throw createError('Missing required fields: modelId, inputs', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceClient.translateText(modelId, { inputs, parameters });
  
  res.json({
    success: true,
    result,
    modelId,
    message: 'Translation completed successfully'
  });
}));

// Question answering endpoint
router.post('/inference/question-answering', asyncHandler(async (req, res) => {
  const { modelId, question, context } = req.body;
  
  if (!modelId || !question || !context) {
    throw createError('Missing required fields: modelId, question, context', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceClient.answerQuestion(modelId, question, context);
  
  res.json({
    success: true,
    result,
    modelId,
    message: 'Question answering completed successfully'
  });
}));

// Sentiment analysis endpoint
router.post('/inference/sentiment', asyncHandler(async (req, res) => {
  const { modelId, text } = req.body;
  
  if (!modelId || !text) {
    throw createError('Missing required fields: modelId, text', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceClient.analyzeSentiment(modelId, text);
  
  res.json({
    success: true,
    result,
    modelId,
    message: 'Sentiment analysis completed successfully'
  });
}));

// Image generation endpoint
router.post('/inference/image-generation', asyncHandler(async (req, res) => {
  const { modelId, inputs, parameters } = req.body;
  
  if (!modelId || !inputs) {
    throw createError('Missing required fields: modelId, inputs', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const imageBlob = await huggingfaceClient.generateImage(modelId, { inputs, parameters });
  
  // Convert blob to base64 for JSON response
  const buffer = await imageBlob.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString('base64');
  
  res.json({
    success: true,
    image: `data:image/png;base64,${base64Image}`,
    modelId,
    message: 'Image generation completed successfully'
  });
}));

// Find optimal models for a task context
router.post('/models/optimal', asyncHandler(async (req, res) => {
  const { taskType, requirements, constraints, expectedOutputs } = req.body;
  
  if (!taskType || !requirements) {
    throw createError('Missing required fields: taskType, requirements', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const taskContext = {
    taskType,
    requirements: Array.isArray(requirements) ? requirements : [requirements],
    constraints: Array.isArray(constraints) ? constraints : (constraints ? [constraints] : []),
    expectedOutputs: Array.isArray(expectedOutputs) ? expectedOutputs : (expectedOutputs ? [expectedOutputs] : [])
  };
  
  const result = await huggingfaceClient.findOptimalModelsForTask(taskContext);
  
  res.json({
    success: true,
    result,
    taskContext,
    message: `Found ${result.primaryModels.length} primary and ${result.supportingModels.length} supporting models`
  });
}));

// Analyze requirements and recommend models
router.post('/analysis/recommend', asyncHandler(async (req, res) => {
  const { requirements } = req.body;
  
  if (!requirements || !Array.isArray(requirements)) {
    throw createError('Requirements must be a non-empty array', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const result = await huggingfaceEnhancer.analyzeAndRecommendModels(requirements);
  
  res.json({
    success: true,
    result,
    message: `Analyzed requirements and recommended ${result.recommendations.length} models`
  });
}));

// Enhance MCP with HuggingFace capabilities
router.post('/enhancement/mcp', asyncHandler(async (req, res) => {
  const { mcpContext, enhancementContext } = req.body;
  
  if (!mcpContext || !enhancementContext) {
    throw createError('Missing required fields: mcpContext, enhancementContext', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  // Validate enhancement context
  if (!enhancementContext.taskType || !enhancementContext.requirements) {
    throw createError('Invalid enhancementContext: missing taskType or requirements', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const enhancedMcp = await huggingfaceEnhancer.enhanceMcpWithHuggingFace(mcpContext, enhancementContext);
  
  res.json({
    success: true,
    enhancedMcp,
    message: `Enhanced MCP with ${enhancedMcp.huggingfaceModels.primary.length} primary HuggingFace models`
  });
}));

// Generate HuggingFace tools for Smithery
router.post('/tools/generate', asyncHandler(async (req, res) => {
  const { enhancementContext, models } = req.body;
  
  if (!enhancementContext || !models) {
    throw createError('Missing required fields: enhancementContext, models', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const tools = await huggingfaceEnhancer.generateHuggingFaceTools(enhancementContext, models);
  
  res.json({
    success: true,
    tools,
    count: tools.length,
    message: `Generated ${tools.length} HuggingFace-enhanced tools`
  });
}));

// Create enhanced Smithery project
router.post('/smithery/enhance', asyncHandler(async (req, res) => {
  const { baseProject, enhancementContext } = req.body;
  
  if (!baseProject || !enhancementContext) {
    throw createError('Missing required fields: baseProject, enhancementContext', 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const enhancedProject = await huggingfaceEnhancer.createEnhancedSmitheryProject(baseProject, enhancementContext);
  
  res.json({
    success: true,
    enhancedProject,
    message: `Enhanced Smithery project with HuggingFace capabilities`
  });
}));

// Get HuggingFace capabilities and features
router.get('/capabilities', cacheMiddleware({ ttl: 3600000 }), asyncHandler(async (req, res) => {
  const capabilities = {
    supportedTasks: [
      'text-generation',
      'text-classification', 
      'question-answering',
      'summarization',
      'translation',
      'sentiment-analysis',
      'feature-extraction',
      'text-to-image',
      'image-classification',
      'object-detection',
      'automatic-speech-recognition',
      'text-to-speech'
    ],
    enhancementFeatures: [
      'Model discovery and recommendation',
      'Multi-model orchestration',
      'Intelligent fallback chains',
      'Performance optimization',
      'Automatic caching',
      'Batch processing',
      'Streaming support',
      'Dataset integration'
    ],
    integrationOptions: [
      'Smithery MCP enhancement',
      'Autonomous tool creation',
      'Workflow orchestration',
      'Real-time inference',
      'Embedding generation',
      'Similarity search'
    ],
    freeModels: {
      textGeneration: [
        'microsoft/DialoGPT-medium',
        'distilgpt2',
        'gpt2'
      ],
      embeddings: [
        'sentence-transformers/all-MiniLM-L6-v2',
        'sentence-transformers/all-mpnet-base-v2'
      ],
      classification: [
        'cardiffnlp/twitter-roberta-base-sentiment-latest',
        'distilbert-base-uncased-finetuned-sst-2-english'
      ],
      imageGeneration: [
        'runwayml/stable-diffusion-v1-5',
        'CompVis/stable-diffusion-v1-4'
      ]
    },
    performanceMetrics: {
      averageResponseTime: '2-8 seconds',
      throughput: '10-100 requests/minute',
      availability: '99.5%',
      supportedLanguages: '100+ languages'
    }
  };
  
  res.json(capabilities);
}));

// Get popular free models by category
router.get('/models/free/:category', cacheMiddleware({ ttl: 600000 }), asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { limit = 10 } = req.query;
  
  const categoryMappings: Record<string, string> = {
    'text-generation': 'text-generation',
    'embeddings': 'feature-extraction',
    'classification': 'text-classification',
    'summarization': 'summarization',
    'translation': 'translation',
    'image-generation': 'text-to-image',
    'question-answering': 'question-answering'
  };
  
  const pipelineTag = categoryMappings[category];
  if (!pipelineTag) {
    throw createError(`Unsupported category: ${category}`, 400, 'VALIDATION_ERROR', 'HuggingFace');
  }
  
  const models = await huggingfaceClient.searchModels({
    pipeline_tag: pipelineTag,
    sort: 'downloads',
    direction: 'desc',
    limit: parseInt(limit as string),
    filter: 'free'
  });
  
  res.json({
    success: true,
    models,
    category,
    count: models.length,
    message: `Found ${models.length} free ${category} models`
  });
}));

export default router;