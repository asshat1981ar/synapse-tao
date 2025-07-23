import type { Express } from "express";
import { aiIntegrationService } from "../services/aiIntegration";

export function registerChatRoutes(app: Express) {
  // AI Chat endpoint for IDE
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, agent = 'maestro', context, useMaestro = false } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // If useMaestro is true, route through the Maestro Orchestrator
      if (useMaestro) {
        console.log(`[ChatAPI] Routing through Maestro Orchestrator`);
        
        const { maestroOrchestrator } = await import('../services/maestroOrchestrator');
        
        const orchestrationResult = await maestroOrchestrator.orchestrate({
          input: message,
          context: context || {},
          options: {
            complexity: 'medium'
          }
        });

        return res.json({
          response: orchestrationResult.finalResult,
          agent: 'maestro-orchestrator',
          timestamp: new Date().toISOString(),
          metadata: {
            executionPath: orchestrationResult.executionPath,
            totalTime: orchestrationResult.totalTime,
            confidence: orchestrationResult.confidence,
            stagesExecuted: orchestrationResult.stages.length,
            modelsUsed: orchestrationResult.metadata.modelsUsed
          }
        });
      }

      // Create context-aware prompt
      let contextualPrompt = message;
      
      if (context?.activeFile) {
        contextualPrompt = `Context: Currently working on file ${context.activeFile}\n\nUser: ${message}`;
      }

      if (context?.openFiles?.length > 0) {
        contextualPrompt += `\n\nOpen files: ${context.openFiles.join(', ')}`;
      }

      // Process through AI integration service
      const response = await aiIntegrationService.processRequest({
        prompt: contextualPrompt,
        maxTokens: 1500
        // Let the AI service choose the best available provider/model
      });

      res.json({
        response: response.content,
        agent: agent,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({ 
        error: 'Failed to process chat message',
        details: (error as Error).message 
      });
    }
  });

  // Get available AI agents
  app.get('/api/ai/agents', async (req, res) => {
    try {
      const agents = [
        {
          id: 'maestro',
          name: 'Maestro',
          description: 'Task orchestration and general assistance',
          capabilities: ['task-management', 'coordination', 'general-help'],
          status: 'online'
        },
        {
          id: 'ai-integration',
          name: 'AI Assistant',
          description: 'Code generation and AI-powered development tasks',
          capabilities: ['code-generation', 'debugging', 'optimization'],
          status: 'online'
        },
        {
          id: 'cognitive-refiner',
          name: 'Optimizer',
          description: 'Performance optimization and code improvement',
          capabilities: ['performance-analysis', 'optimization', 'refactoring'],
          status: 'online'
        },
        {
          id: 'coordinator',
          name: 'Coordinator',
          description: 'Project planning and task decomposition',
          capabilities: ['project-planning', 'task-breakdown', 'architecture'],
          status: 'online'
        }
      ];

      res.json(agents);
    } catch (error) {
      console.error('Error fetching AI agents:', error);
      res.status(500).json({ error: 'Failed to fetch AI agents' });
    }
  });

  // Code analysis endpoint
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { code, language, analysisType = 'general' } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      let prompt = '';
      
      switch (analysisType) {
        case 'debug':
          prompt = `Analyze this ${language} code for potential bugs and issues:\n\n${code}\n\nProvide specific feedback on potential problems and suggested fixes.`;
          break;
        case 'optimize':
          prompt = `Analyze this ${language} code for performance optimization opportunities:\n\n${code}\n\nSuggest specific improvements for better performance.`;
          break;
        case 'refactor':
          prompt = `Suggest refactoring improvements for this ${language} code:\n\n${code}\n\nFocus on code structure, readability, and maintainability.`;
          break;
        default:
          prompt = `Analyze this ${language} code and provide general feedback:\n\n${code}\n\nInclude comments on code quality, potential issues, and suggestions for improvement.`;
      }

      const response = await aiIntegrationService.processRequest({
        prompt: prompt,
        model: 'gpt-4o',
        maxTokens: 1500
      });

      res.json({
        analysis: response.content,
        analysisType,
        language,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Code analysis error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze code',
        details: (error as Error).message 
      });
    }
  });

  // Code generation endpoint
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { prompt, language, framework, context } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      let enhancedPrompt = `Generate ${language} code for: ${prompt}`;
      
      if (framework) {
        enhancedPrompt += `\nFramework: ${framework}`;
      }
      
      if (context?.activeFile) {
        enhancedPrompt += `\nContext: Working in file ${context.activeFile}`;
      }
      
      enhancedPrompt += '\n\nProvide clean, well-commented, production-ready code.';

      const response = await aiIntegrationService.processRequest({
        prompt: enhancedPrompt,
        model: 'gpt-4o',
        maxTokens: 2000
      });

      res.json({
        code: response.content,
        language,
        framework,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Code generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate code',
        details: (error as Error).message 
      });
    }
  });
}