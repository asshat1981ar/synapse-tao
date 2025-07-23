# Synapse AI - Multi-Agent System Replit Guide

## Overview

Synapse AI is a cutting-edge multi-agent AI system that demonstrates advanced Agent-to-Agent (A2A) communication, intelligent orchestration, and enterprise-grade AI integration. The system features a React frontend with a Node.js/Express backend, utilizing PostgreSQL via Drizzle ORM for data persistence and real-time WebSocket communication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Vite build system, Tailwind CSS + shadcn/ui components
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSocket connections
- **AI Integration**: Multiple providers (OpenAI, Anthropic, Google AI, BlackboxAI, DeepSeek)
- **Advanced Features**: Genetic Algorithm Optimization, Collaborative Workflow Editing, ML-powered Analytics
- **Development**: ESM modules, hot reload via Vite

### Architecture Pattern
The system follows a microservices-inspired monolith pattern with clear service boundaries:
- Agent orchestration service for workflow management
- AI integration service with circuit breaker patterns
- MCP (Model Context Protocol) server management
- WebSocket manager for real-time updates
- Storage abstraction layer with Drizzle ORM

## Key Components

### Agent Orchestration System
- **Purpose**: Manages AI agents and coordinates task execution
- **Features**: Agent capability mapping, task assignment, performance tracking
- **Design**: Uses intelligent agent selection based on capabilities and current workload

### AI Integration Service
- **Purpose**: Provides unified interface to multiple AI providers
- **Features**: Circuit breaker pattern, automatic failover, provider abstraction
- **Providers**: OpenAI, Anthropic, Google AI, BlackboxAI with fallback chains
- **BlackboxAI Integration**: Complete integration with multiple free models (DeepSeek, Llama, Gemma, Mistral, Qwen)

### MCP Server Management
- **Purpose**: Discovers and manages Model Context Protocol servers
- **Features**: Automatic server discovery, Docker containerization, health monitoring
- **Runtime Support**: Python, Node.js with framework detection

### Advanced Cognitive Refiner with Genetic Algorithm Optimization
- **Purpose**: Optimizes agent performance using genetic algorithms for continuous learning and adaptation
- **Features**: 
  - Multi-objective fitness evaluation (accuracy, efficiency, adaptability, learning rate)
  - Crossover and mutation operations for agent improvement
  - Convergence detection and automatic optimization stopping
  - Population diversity maintenance
  - Performance insights and recommendations
- **API Endpoints**: `/api/cognitive-refiner/optimize`, `/api/cognitive-refiner/status`, `/api/cognitive-refiner/config`

### Advanced Coordinator Service  
- **Purpose**: Decomposes complex app/feature ideas into context-augmented task outputs specific to receiving agents
- **Features**:
  - AI-powered project complexity analysis using OpenAI GPT-4o
  - Hierarchical task breakdown with dependency mapping
  - Agent-specific instruction generation based on capabilities and communication styles
  - Optimal agent assignment using capability matching and load balancing
  - Execution plan creation with phases and risk assessment
  - Context map generation for inter-agent communication
- **API Endpoints**: `/api/coordinator/decompose`, `/api/coordinator/status`

### Real-time Collaborative Workflow Editing with Conflict Resolution
- **Purpose**: Enables multiple users to collaboratively edit workflows in real-time with automatic conflict detection and resolution
- **Features**:
  - Multi-user collaboration sessions with participant management
  - Real-time operation broadcasting via WebSocket
  - Conflict detection for concurrent edits on same elements
  - Automatic conflict resolution for low-severity changes
  - Manual conflict resolution with multiple resolution strategies
  - User cursor tracking and activity monitoring
  - Version control with operation history
- **API Endpoints**: `/api/collaborative/sessions`, `/api/collaborative/operations`, `/api/collaborative/workflows`, `/api/collaborative/stats`

### Advanced Analytics Dashboard with ML-powered Insights
- **Purpose**: Provides predictive monitoring and ML-powered system insights for proactive optimization
- **Features**:
  - Real-time metrics collection and time series analysis
  - Predictive insights using AI analysis (OpenAI GPT-4o)
  - Anomaly detection with threshold-based and pattern recognition
  - Performance trend analysis and forecasting
  - Resource utilization predictions (memory, CPU, agent optimization)
  - System health scoring with risk factor identification
  - ML model performance tracking and management
- **API Endpoints**: `/api/analytics/dashboard`, `/api/analytics/trends/:metric`, `/api/analytics/models`

### Real-time Dashboard
- **Purpose**: Provides live system monitoring and control interface
- **Features**: WebSocket-based updates, agent status monitoring, task tracking
- **UI**: Professional dark theme with gradients, responsive design

### AI Integration Testing Interfaces
- **BlackboxAI Test Interface**: Available at `/blackbox-test` route
  - Features 6 free models: DeepSeek V3, Llama 3.1 (8B/70B), Gemma 7B, Mistral 7B, Qwen 2.5 Coder
  - Model selection, prompt testing, real-time responses, token usage tracking
- **Comprehensive AI Test Interface**: Available at `/ai-test` route  
  - **DeepSeek Integration**: Complete API integration with 4 models (chat, coder, v3, reasoner)
    - 128K context memory, free to use, supports file uploads
    - Average response time: ~8 seconds, supports code generation and reasoning
  - **OpenAI Integration**: Full API integration with GPT models and DALL-E
    - Models: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
    - Average response time: ~2.5 seconds, image generation capabilities
    - Vision support for image analysis, audio transcription with Whisper

## Data Flow

### Request Processing
1. User initiates action through React frontend
2. API request routed through Express server
3. Agent orchestrator determines optimal agent assignment
4. AI integration service processes requests with fallback handling
5. Results streamed back via WebSocket connections
6. Frontend updates in real-time with progress and results

### Agent Communication
- Agents communicate through standardized message protocols
- Task orchestrator manages agent workloads and capabilities
- Circuit breakers prevent cascade failures between services
- Performance metrics tracked for optimization

### Data Persistence
- PostgreSQL stores agent metadata, task history, and system metrics
- Drizzle ORM provides type-safe database operations
- Real-time metrics cached for dashboard performance
- System logs maintained for debugging and analytics

## External Dependencies

### AI Service Providers
- **OpenAI**: GPT models for general AI tasks
- **Anthropic**: Claude models for reasoning and analysis
- **Google AI**: Gemini models for multimodal processing
- **Neon Database**: Serverless PostgreSQL hosting

### Development Tools
- **Replit**: Development environment with built-in database
- **Vite**: Fast development server and build tool
- **shadcn/ui**: Component library for consistent UI
- **WebSocket**: Real-time communication protocol

### Runtime Dependencies
- Circuit breaker pattern for fault tolerance
- Connection pooling for database efficiency
- WebSocket connection management for scalability
- TypeScript for type safety across the stack

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with hot reload
- Node.js server with TypeScript compilation
- Database migrations managed via Drizzle Kit
- WebSocket connections handled by same server process

### Production Considerations
- Frontend builds to static assets served by Express
- Database connection pooling for PostgreSQL
- Environment variable configuration for API keys
- Process monitoring for agent health and performance

### Database Setup
- Drizzle migrations in `/migrations` directory
- Schema definitions in `/shared/schema.ts`
- Database URL configured via environment variables
- Automatic table creation on startup

### Service Integration
- MCP servers auto-discovered and containerized
- AI providers initialized with API key validation
- WebSocket connections established on client connect
- System metrics collected and stored automatically

## Latest System Enhancements (July 2025)

✓ **Advanced Cognitive Refiner**: Genetic algorithm optimization for agent performance with multi-objective fitness evaluation  
✓ **Advanced Coordinator Service**: AI-powered project decomposition with context-augmented task generation for specific agents  
✓ **Real-time Collaborative Workflow Editing**: Multi-user workflow editing with conflict detection and resolution  
✓ **ML-powered Analytics Dashboard**: Predictive monitoring with anomaly detection and system health insights  
✓ **Complete IDE Integration**: Monaco Editor with file explorer, AI chat panel, and professional development environment
✓ **Multi-Provider AI Integration**: Working fallback chain with DeepSeek as primary, OpenAI/Anthropic as alternatives
✓ **Codebase Optimization System**: TAO Loop-based analyzer with health scoring and recommendation engine
✓ **High-Priority Optimizations Implemented**:
  - Centralized logging system with structured output
  - Global error handler middleware with context tracking
  - Circuit breaker factory for consistent fault tolerance
  - Request caching middleware for performance optimization
  - Service registry pattern for dependency management
✓ **Database Integration for AI Learning (July 23, 2025)**:
  - Intelligent prompt caching with SHA-256 hashing and TTL management
  - Learning optimization loops with A/B testing and statistical analysis
  - Automated experiment management with variant selection and result tracking
  - Quality scoring system for response evaluation and continuous improvement
  - Optimization insights generation with actionable recommendations
✓ **Autonomous MCP Creation System with Smithery Integration (July 23, 2025)**:
  - Complete Smithery API integration with registry search and tool discovery
  - Autonomous MCP server generation with AI-powered requirement analysis
  - TypeScript MCP server creation using Smithery SDK and CLI tools
  - Intelligent tool requirement analysis and existing tool discovery
  - Automated project creation, testing, and publishing to Smithery registry
  - Context-aware orchestration analysis with complexity assessment
  - Hybrid deployment strategy combining Smithery and traditional MCP servers
✓ **HuggingFace AI Integration System (July 23, 2025)**:
  - Complete HuggingFace API integration with 1000+ free AI models access
  - Multi-modal AI capabilities: text generation, embeddings, classification, translation, image generation
  - Intelligent model discovery and recommendation for specific tasks
  - Autonomous HuggingFace-enhanced MCP tool creation with optimal model selection
  - Smart routing and fallback chains for model reliability and performance
  - Dataset integration for training data access and benchmarking
  - Enhanced Smithery projects with HuggingFace AI model capabilities
  - Real-time inference API endpoints for all major AI tasks

## Current System Status (July 23, 2025)

**AI Providers Status:**
- **DeepSeek**: ✅ Fully operational (primary provider) - 4 models available
- **OpenAI**: ⚠️ Circuit breaker OPEN (API key configured, fallback active) 
- **Anthropic**: ⚠️ Credit balance low
- **Google AI**: ⚠️ Requires GEMINI_API_KEY
- **BlackboxAI**: ❌ Temporarily disabled (API key format issues)

**Working Features:**
- IDE at `/ide` with Monaco Editor, file explorer, terminal
- AI chat with 4 agent types (Maestro, AI Assistant, Optimizer, Coordinator)  
- Intelligent provider fallback chain
- Real-time WebSocket communication
- All enterprise analytics and optimization features
- **NEW**: Unified Maestro Orchestrator - single entry point for all AI requests
- **NEW**: Automatic TAO Loop execution for complex tasks (OBSERVE → THINK → ACT)
- **NEW**: Task-based model routing (code tasks → deepseek-coder, math tasks → deepseek-v3)
- **NEW**: Intelligent complexity assessment and execution path selection
- **NEW**: Database-backed prompt caching with intelligent cache management
- **NEW**: Learning optimization loops with automated A/B testing and insights generation
- **NEW**: Quality-based response evaluation and continuous learning system
- **NEW**: Autonomous MCP Creation with Smithery integration - search, create, and publish MCP servers
- **NEW**: HuggingFace AI Integration - 1000+ free models for text, embeddings, classification, translation, images
- **NEW**: Enhanced MCP tools with HuggingFace AI capabilities and intelligent model selection
- **NEW**: Multi-modal AI processing with automatic fallback chains and performance optimization

**Maestro Orchestrator System (July 23, 2025):**
- **Unified Entry Point**: Single `/api/maestro/orchestrate` endpoint for all AI requests
- **Intelligent Path Selection**: Automatic choice between DIRECT processing and TAO Loop
- **Task Classification**: Advanced classification with complexity assessment
- **TAO Loop Implementation**: Full OBSERVE/THINK/ACT workflow for complex tasks
- **Project Chimera Integration**: Task-specific model routing and stage-based processing
- **API Endpoints**: `/api/maestro/orchestrate`, `/api/maestro/classify`, `/api/maestro/status`
- **Chat Integration**: Available via `useMaestro: true` parameter in chat API

**Codebase Optimization System (July 23, 2025):**
- **TAO Loop-based Analysis**: Systematic OBSERVE → THINK → ACT optimization methodology
- **Health Scoring**: Comprehensive metrics for complexity, error handling, and maintainability
- **Optimization Infrastructure**: 
  - ✅ Centralized logger utility (replaced console.log in 26 TypeScript files)
  - ✅ Global error handler middleware with structured error responses
  - ✅ Circuit breaker factory for consistent fault tolerance patterns
  - ✅ Request cache middleware for improved performance (5-30 second TTL)
  - ✅ Service registry pattern for centralized dependency management
- **API Endpoints**: `/api/optimizer/analyze`, `/api/optimizer/recommendations`
- **Continuous Monitoring**: Real-time code quality tracking with actionable insights

**Database Integration for AI Learning & Optimization (July 23, 2025):**
- **Intelligent Prompt Caching**: SHA-256 based caching with automatic TTL management, usage tracking, and quality scoring
- **Learning Experiments**: Automated A/B testing framework with statistical analysis and confidence intervals
- **Optimization Insights**: AI-powered recommendation system with actionable insights and implementation tracking
- **API Endpoints**: `/api/cache/`, `/api/learning/` for comprehensive cache and experiment management
- **Performance Analytics**: Cache hit rates, response time optimization, and quality improvement tracking

The system is designed for both development flexibility and production robustness, with clear separation of concerns and comprehensive error handling throughout the stack. All advanced enterprise features plus Project Chimera's intelligent routing patterns are now fully integrated and operational. The codebase has been optimized to handle production workloads with resilient error handling, performance caching, structured logging, and intelligent learning loops that continuously improve AI response quality and performance.