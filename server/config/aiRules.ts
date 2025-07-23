/**
 * AI Model Selection and Agent Behavior Rules
 * Configurable system for intelligent provider selection and agent coordination
 * Based on Project Chimera principles, adapted for Synapse AI
 */

export interface ModelSelectionRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    taskType?: string[];
    complexityLevel?: 'low' | 'medium' | 'high';
    contextLength?: number;
    userRole?: string[];
    responseTimeRequirement?: 'fast' | 'balanced' | 'quality';
  };
  preferredProviders: string[];
  preferredModels: Record<string, string>;
  fallbackStrategy: 'performance' | 'cost' | 'availability';
}

export interface AgentBehaviorRule {
  agentId: string;
  name: string;
  capabilities: string[];
  specializations: {
    taskTypes: string[];
    preferredProviders: string[];
    systemPrompts: Record<string, string>;
  };
  coordinationRules: {
    canDelegateToAgents: string[];
    escalationConditions: string[];
    collaborationPatterns: string[];
  };
  performanceThresholds: {
    responseTime: number;
    qualityScore: number;
    successRate: number;
  };
}

export interface ContextualRoutingRule {
  id: string;
  trigger: {
    keywords?: string[];
    fileTypes?: string[];
    projectType?: string[];
    userIntent?: string[];
  };
  routing: {
    preferredAgent: string;
    requiredCapabilities: string[];
    contextEnhancement: string[];
  };
  adaptiveSettings: {
    learningEnabled: boolean;
    performanceTracking: boolean;
    autoOptimization: boolean;
  };
}

// Project Chimera TAO Loop Stages
export type TAOStage = 'OBSERVE' | 'THINK' | 'ACT';

export interface TAOStageRule {
  stage: TAOStage;
  description: string;
  preferredProviders: string[];
  preferredModels: Record<string, string>;
  systemPrompt: string;
  nextStage?: TAOStage;
}

// Project Chimera Model Registry (adapted from Project Chimera)
export const chimeraModelRegistry = {
  blackbox: {
    default: "blackboxai/deepseek/deepseek-v3-base:free",
    reasoning: "blackboxai/qwen/qwen3-32b:free", 
    agent: "blackboxai/moonshotai/kimi-dev-72b:free"
  },
  deepseek: {
    coder: "deepseek-coder",
    math: "deepseek-v3", 
    reasoner: "deepseek-reasoner"
  },
  openai: {
    chat: "gpt-4o",
    fast: "gpt-4o-mini"
  }
};

// TAO Loop Stage Rules (from Project Chimera)
export const taoStageRules: TAOStageRule[] = [
  {
    stage: 'OBSERVE',
    description: 'Analyze and understand the current situation',
    preferredProviders: ['deepseek', 'openai'],
    preferredModels: {
      deepseek: 'deepseek-chat',
      openai: 'gpt-4o',
      blackbox: 'blackboxai/deepseek/deepseek-v3-base:free'
    },
    systemPrompt: 'OBSERVE the situation carefully. Analyze the requirements, context, and current state. Provide detailed observations.',
    nextStage: 'THINK'
  },
  {
    stage: 'THINK',
    description: 'Reason about observations and plan approach',
    preferredProviders: ['openai', 'anthropic', 'deepseek'],
    preferredModels: {
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-20250514',
      deepseek: 'deepseek-reasoner'
    },
    systemPrompt: 'THINK deeply about the observations. Reason through the problem, consider alternatives, and formulate a strategic approach.',
    nextStage: 'ACT'
  },
  {
    stage: 'ACT',
    description: 'Execute the planned approach',
    preferredProviders: ['deepseek', 'openai'],
    preferredModels: {
      deepseek: 'deepseek-coder',
      openai: 'gpt-4o',
      blackbox: 'blackboxai/moonshotai/kimi-dev-72b:free'
    },
    systemPrompt: 'ACT on the thinking and observations. Implement the solution, generate code, or execute the planned approach.',
    nextStage: undefined
  }
];

// Enhanced Model Selection Rules (inspired by Project Chimera)
export const defaultModelSelectionRules: ModelSelectionRule[] = [
  {
    id: 'chimera-code-tasks',
    name: 'Project Chimera Code Tasks',
    priority: 110,
    conditions: {
      taskType: ['code-generation', 'debugging', 'code'],
      responseTimeRequirement: 'fast',
      complexityLevel: 'low'
    },
    preferredProviders: ['deepseek'],
    preferredModels: {
      deepseek: 'deepseek-coder'
    },
    fallbackStrategy: 'performance'
  },
  {
    id: 'chimera-math-tasks', 
    name: 'Project Chimera Math Tasks',
    priority: 105,
    conditions: {
      taskType: ['math', 'calculation', 'analysis'],
      complexityLevel: 'medium'
    },
    preferredProviders: ['deepseek'],
    preferredModels: {
      deepseek: 'deepseek-v3'
    },
    fallbackStrategy: 'performance'
  },
  {
    id: 'code-generation-fast',
    name: 'Fast Code Generation',
    priority: 100,
    conditions: {
      taskType: ['code-generation', 'debugging'],
      responseTimeRequirement: 'fast',
      complexityLevel: 'low'
    },
    preferredProviders: ['deepseek', 'openai'],
    preferredModels: {
      deepseek: 'deepseek-coder',
      openai: 'gpt-4o-mini'
    },
    fallbackStrategy: 'performance'
  },
  {
    id: 'complex-reasoning',
    name: 'Complex Reasoning Tasks',
    priority: 90,
    conditions: {
      taskType: ['analysis', 'planning', 'architecture'],
      complexityLevel: 'high',
      responseTimeRequirement: 'quality'
    },
    preferredProviders: ['anthropic', 'openai', 'deepseek'],
    preferredModels: {
      anthropic: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o',
      deepseek: 'deepseek-reasoner'
    },
    fallbackStrategy: 'performance'
  },
  {
    id: 'creative-tasks',
    name: 'Creative and Content Tasks',
    priority: 80,
    conditions: {
      taskType: ['creative-writing', 'content-generation'],
      responseTimeRequirement: 'balanced'
    },
    preferredProviders: ['openai', 'anthropic'],
    preferredModels: {
      openai: 'gpt-4o',
      anthropic: 'claude-3-7-sonnet-20250219'
    },
    fallbackStrategy: 'availability'
  },
  {
    id: 'general-assistance',
    name: 'General User Assistance',
    priority: 50,
    conditions: {
      taskType: ['general-help', 'conversation'],
      responseTimeRequirement: 'balanced'
    },
    preferredProviders: ['deepseek', 'openai', 'anthropic'],
    preferredModels: {
      deepseek: 'deepseek-chat',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022'
    },
    fallbackStrategy: 'cost'
  }
];

// Agent Behavior Rules (based on current Synapse AI agents)
export const defaultAgentBehaviorRules: AgentBehaviorRule[] = [
  {
    agentId: 'maestro',
    name: 'Maestro Orchestrator',
    capabilities: ['task-management', 'coordination', 'general-help', 'delegation'],
    specializations: {
      taskTypes: ['orchestration', 'planning', 'general-assistance'],
      preferredProviders: ['deepseek', 'openai'],
      systemPrompts: {
        default: 'You are Maestro, an intelligent task orchestrator. Coordinate complex workflows and provide strategic guidance.',
        technical: 'You are Maestro, coordinating technical tasks. Break down complex problems and assign work efficiently.',
        creative: 'You are Maestro, guiding creative projects. Balance innovation with practical execution.'
      }
    },
    coordinationRules: {
      canDelegateToAgents: ['ai-integration', 'cognitive-refiner', 'coordinator'],
      escalationConditions: ['high-complexity', 'multi-agent-required', 'specialized-knowledge'],
      collaborationPatterns: ['sequential', 'parallel', 'hierarchical']
    },
    performanceThresholds: {
      responseTime: 10000, // 10 seconds
      qualityScore: 0.8,
      successRate: 0.9
    }
  },
  {
    agentId: 'ai-integration',
    name: 'AI Assistant',
    capabilities: ['code-generation', 'debugging', 'optimization', 'analysis'],
    specializations: {
      taskTypes: ['coding', 'development', 'technical-analysis'],
      preferredProviders: ['deepseek', 'openai'],
      systemPrompts: {
        coding: 'You are an expert developer. Generate clean, efficient, well-documented code.',
        debugging: 'You are a debugging specialist. Identify issues and provide clear solutions.',
        optimization: 'You are a performance expert. Optimize code for speed, efficiency, and maintainability.'
      }
    },
    coordinationRules: {
      canDelegateToAgents: ['cognitive-refiner'],
      escalationConditions: ['architecture-decisions', 'security-concerns'],
      collaborationPatterns: ['peer-review', 'iterative-refinement']
    },
    performanceThresholds: {
      responseTime: 15000, // 15 seconds for code generation
      qualityScore: 0.85,
      successRate: 0.88
    }
  },
  {
    agentId: 'cognitive-refiner',
    name: 'Optimizer',
    capabilities: ['performance-analysis', 'optimization', 'refactoring', 'quality-assessment'],
    specializations: {
      taskTypes: ['optimization', 'analysis', 'improvement'],
      preferredProviders: ['deepseek', 'anthropic'],
      systemPrompts: {
        performance: 'You are a performance optimization expert. Analyze and improve system efficiency.',
        quality: 'You are a code quality specialist. Enhance maintainability and best practices.',
        architecture: 'You are an architecture reviewer. Evaluate and optimize system design.'
      }
    },
    coordinationRules: {
      canDelegateToAgents: [],
      escalationConditions: ['major-refactoring', 'breaking-changes'],
      collaborationPatterns: ['iterative-improvement', 'analytical-deep-dive']
    },
    performanceThresholds: {
      responseTime: 20000, // 20 seconds for deep analysis
      qualityScore: 0.9,
      successRate: 0.85
    }
  },
  {
    agentId: 'coordinator',
    name: 'Project Coordinator',
    capabilities: ['project-planning', 'task-breakdown', 'architecture', 'strategic-planning'],
    specializations: {
      taskTypes: ['planning', 'coordination', 'architecture', 'strategy'],
      preferredProviders: ['anthropic', 'openai', 'deepseek'],
      systemPrompts: {
        planning: 'You are a project planning expert. Create comprehensive, actionable project plans.',
        architecture: 'You are a system architect. Design scalable, maintainable system architectures.',
        strategy: 'You are a strategic advisor. Provide high-level guidance and decision support.'
      }
    },
    coordinationRules: {
      canDelegateToAgents: ['maestro', 'ai-integration', 'cognitive-refiner'],
      escalationConditions: ['resource-constraints', 'timeline-conflicts'],
      collaborationPatterns: ['strategic-oversight', 'cross-functional-coordination']
    },
    performanceThresholds: {
      responseTime: 25000, // 25 seconds for strategic planning
      qualityScore: 0.88,
      successRate: 0.82
    }
  }
];

// Contextual Routing Rules
export const defaultContextualRoutingRules: ContextualRoutingRule[] = [
  {
    id: 'code-file-context',
    trigger: {
      fileTypes: ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp'],
      keywords: ['code', 'function', 'class', 'debug', 'optimize']
    },
    routing: {
      preferredAgent: 'ai-integration',
      requiredCapabilities: ['code-generation', 'debugging'],
      contextEnhancement: ['file-content', 'language-specific', 'project-structure']
    },
    adaptiveSettings: {
      learningEnabled: true,
      performanceTracking: true,
      autoOptimization: true
    }
  },
  {
    id: 'planning-context',
    trigger: {
      keywords: ['plan', 'architecture', 'design', 'strategy', 'roadmap'],
      userIntent: ['project-planning', 'system-design']
    },
    routing: {
      preferredAgent: 'coordinator',
      requiredCapabilities: ['project-planning', 'architecture'],
      contextEnhancement: ['project-scope', 'requirements', 'constraints']
    },
    adaptiveSettings: {
      learningEnabled: true,
      performanceTracking: true,
      autoOptimization: false
    }
  },
  {
    id: 'optimization-context',
    trigger: {
      keywords: ['optimize', 'improve', 'performance', 'refactor', 'enhance'],
      userIntent: ['performance-improvement', 'code-quality']
    },
    routing: {
      preferredAgent: 'cognitive-refiner',
      requiredCapabilities: ['performance-analysis', 'optimization'],
      contextEnhancement: ['performance-metrics', 'current-state', 'optimization-goals']
    },
    adaptiveSettings: {
      learningEnabled: true,
      performanceTracking: true,
      autoOptimization: true
    }
  },
  {
    id: 'general-assistance',
    trigger: {
      keywords: ['help', 'question', 'explain', 'how to'],
      userIntent: ['general-help', 'information']
    },
    routing: {
      preferredAgent: 'maestro',
      requiredCapabilities: ['general-help', 'coordination'],
      contextEnhancement: ['user-context', 'session-history']
    },
    adaptiveSettings: {
      learningEnabled: true,
      performanceTracking: false,
      autoOptimization: false
    }
  }
];

// Advanced configuration options
export interface AdvancedAIConfig {
  // Provider Management
  providerHealthChecks: {
    enabled: boolean;
    interval: number;
    failureThreshold: number;
    recoveryTimeout: number;
  };

  // Performance Optimization
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    smartInvalidation: boolean;
  };

  // Learning and Adaptation
  adaptiveLearning: {
    enabled: boolean;
    learningRate: number;
    adaptationThreshold: number;
    feedbackIntegration: boolean;
  };

  // Context Management
  contextEnhancement: {
    maxContextLength: number;
    relevanceScoring: boolean;
    priorityWeighting: boolean;
    dynamicContextSelection: boolean;
  };

  // Quality Assurance
  qualityGates: {
    enabled: boolean;
    minQualityScore: number;
    responseValidation: boolean;
    contentFiltering: boolean;
  };
}

export const defaultAdvancedConfig: AdvancedAIConfig = {
  providerHealthChecks: {
    enabled: true,
    interval: 30000, // 30 seconds
    failureThreshold: 3,
    recoveryTimeout: 300000 // 5 minutes
  },
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000,
    smartInvalidation: true
  },
  adaptiveLearning: {
    enabled: true,
    learningRate: 0.1,
    adaptationThreshold: 0.8,
    feedbackIntegration: true
  },
  contextEnhancement: {
    maxContextLength: 4000,
    relevanceScoring: true,
    priorityWeighting: true,
    dynamicContextSelection: true
  },
  qualityGates: {
    enabled: true,
    minQualityScore: 0.7,
    responseValidation: true,
    contentFiltering: false
  }
};