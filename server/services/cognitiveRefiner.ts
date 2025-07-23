import { nanoid } from 'nanoid';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  healthScore: number;
  successRate: number;
  averageResponseTime: number;
  totalTasks: number;
  capabilities: string[];
  currentTasks: string[];
  lastHeartbeat: string;
  performanceMetrics?: {
    accuracy: number;
    efficiency: number;
    adaptability: number;
    learning_rate: number;
  };
  genetics?: {
    chromosome: number[];
    fitness: number;
    generation: number;
  };
}

interface GeneticConfig {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  maxGenerations: number;
  convergenceThreshold: number;
}

interface OptimizationResult {
  generation: number;
  bestFitness: number;
  averageFitness: number;
  convergenceRate: number;
  optimizedAgents: Agent[];
  insights: string[];
}

export class CognitiveRefinerService {
  private config: GeneticConfig;
  private currentGeneration: number = 0;
  private populationHistory: Agent[][] = [];
  private fitnessHistory: number[] = [];

  constructor() {
    this.config = {
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.2,
      maxGenerations: 100,
      convergenceThreshold: 0.001
    };
  }

  /**
   * Main optimization function using genetic algorithms
   */
  async optimizeAgentPerformance(agents: Agent[]): Promise<OptimizationResult> {
    console.log('[CognitiveRefiner] Starting genetic algorithm optimization');
    
    // Initialize population with current agents
    let population = this.initializePopulation(agents);
    let bestFitness = 0;
    let convergenceCount = 0;
    
    for (let generation = 0; generation < this.config.maxGenerations; generation++) {
      // Evaluate fitness for each agent
      population = await this.evaluateFitness(population);
      
      // Track fitness statistics
      const currentBestFitness = Math.max(...population.map(agent => agent.genetics?.fitness || 0));
      const averageFitness = population.reduce((sum, agent) => sum + (agent.genetics?.fitness || 0), 0) / population.length;
      
      // Check for convergence
      if (Math.abs(currentBestFitness - bestFitness) < this.config.convergenceThreshold) {
        convergenceCount++;
        if (convergenceCount >= 5) {
          console.log(`[CognitiveRefiner] Converged at generation ${generation}`);
          break;
        }
      } else {
        convergenceCount = 0;
      }
      
      bestFitness = currentBestFitness;
      this.fitnessHistory.push(averageFitness);
      
      // Create next generation
      population = this.createNextGeneration(population);
      this.currentGeneration = generation;
      
      // Store population history for analysis
      this.populationHistory.push([...population]);
      
      console.log(`[CognitiveRefiner] Generation ${generation}: Best=${currentBestFitness.toFixed(3)}, Avg=${averageFitness.toFixed(3)}`);
    }
    
    // Generate insights from optimization
    const insights = this.generateOptimizationInsights(population);
    
    return {
      generation: this.currentGeneration,
      bestFitness,
      averageFitness: this.fitnessHistory[this.fitnessHistory.length - 1] || 0,
      convergenceRate: this.calculateConvergenceRate(),
      optimizedAgents: population.sort((a, b) => (b.genetics?.fitness || 0) - (a.genetics?.fitness || 0)),
      insights
    };
  }

  /**
   * Initialize population with genetic encoding
   */
  private initializePopulation(agents: Agent[]): Agent[] {
    const population: Agent[] = [];
    
    for (const agent of agents) {
      // Create genetic representation
      const chromosome = this.encodeAgentToChromosome(agent);
      const geneticAgent: Agent = {
        ...agent,
        genetics: {
          chromosome,
          fitness: 0,
          generation: 0
        },
        performanceMetrics: {
          accuracy: agent.successRate,
          efficiency: 1.0 / Math.max(agent.averageResponseTime, 0.1),
          adaptability: Math.random() * 0.5 + 0.5, // Initial random value
          learning_rate: Math.random() * 0.3 + 0.1
        }
      };
      population.push(geneticAgent);
    }
    
    // Fill population to desired size with variations
    while (population.length < this.config.populationSize) {
      const baseAgent = agents[Math.floor(Math.random() * agents.length)];
      const mutatedAgent = this.mutateAgent(baseAgent);
      population.push(mutatedAgent);
    }
    
    return population;
  }

  /**
   * Encode agent characteristics to chromosome
   */
  private encodeAgentToChromosome(agent: Agent): number[] {
    return [
      agent.healthScore,
      agent.successRate,
      1.0 / Math.max(agent.averageResponseTime, 0.1), // Efficiency
      agent.capabilities.length / 10.0, // Capability diversity
      agent.totalTasks / 100.0, // Experience factor
      Math.random() * 0.5 + 0.5, // Adaptability
      Math.random() * 0.3 + 0.1, // Learning rate
      Math.random() * 0.4 + 0.6  // Innovation factor
    ];
  }

  /**
   * Evaluate fitness for each agent
   */
  private async evaluateFitness(population: Agent[]): Promise<Agent[]> {
    return population.map(agent => {
      const metrics = agent.performanceMetrics!;
      const chromosome = agent.genetics!.chromosome;
      
      // Multi-objective fitness function
      const fitness = 
        0.3 * metrics.accuracy +
        0.25 * metrics.efficiency +
        0.2 * metrics.adaptability +
        0.15 * metrics.learning_rate +
        0.1 * chromosome[7]; // Innovation factor
      
      agent.genetics!.fitness = Math.max(0, Math.min(1, fitness));
      return agent;
    });
  }

  /**
   * Create next generation using selection, crossover, and mutation
   */
  private createNextGeneration(population: Agent[]): Agent[] {
    const sortedPopulation = population.sort((a, b) => (b.genetics?.fitness || 0) - (a.genetics?.fitness || 0));
    const nextGeneration: Agent[] = [];
    
    // Elitism: Keep best performers
    const eliteCount = Math.floor(population.length * this.config.elitismRate);
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push({ ...sortedPopulation[i] });
    }
    
    // Generate offspring through crossover and mutation
    while (nextGeneration.length < population.length) {
      if (Math.random() < this.config.crossoverRate) {
        // Crossover
        const parent1 = this.tournamentSelection(sortedPopulation);
        const parent2 = this.tournamentSelection(sortedPopulation);
        const offspring = this.crossover(parent1, parent2);
        nextGeneration.push(offspring);
      } else {
        // Mutation
        const parent = this.tournamentSelection(sortedPopulation);
        const offspring = this.mutateAgent(parent);
        nextGeneration.push(offspring);
      }
    }
    
    return nextGeneration;
  }

  /**
   * Tournament selection for parent selection
   */
  private tournamentSelection(population: Agent[], tournamentSize: number = 3): Agent {
    const tournament: Agent[] = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    
    return tournament.reduce((best, current) => 
      (current.genetics?.fitness || 0) > (best.genetics?.fitness || 0) ? current : best
    );
  }

  /**
   * Crossover operation between two parents
   */
  private crossover(parent1: Agent, parent2: Agent): Agent {
    const chromosome1 = parent1.genetics!.chromosome;
    const chromosome2 = parent2.genetics!.chromosome;
    const crossoverPoint = Math.floor(Math.random() * chromosome1.length);
    
    const newChromosome = [
      ...chromosome1.slice(0, crossoverPoint),
      ...chromosome2.slice(crossoverPoint)
    ];
    
    const offspring: Agent = {
      ...parent1,
      id: nanoid(),
      genetics: {
        chromosome: newChromosome,
        fitness: 0,
        generation: this.currentGeneration + 1
      },
      performanceMetrics: {
        accuracy: newChromosome[1],
        efficiency: newChromosome[2],
        adaptability: newChromosome[5],
        learning_rate: newChromosome[6]
      }
    };
    
    return offspring;
  }

  /**
   * Mutation operation
   */
  private mutateAgent(agent: Agent): Agent {
    const chromosome = [...agent.genetics!.chromosome];
    
    for (let i = 0; i < chromosome.length; i++) {
      if (Math.random() < this.config.mutationRate) {
        // Gaussian mutation
        const mutation = (Math.random() - 0.5) * 0.2;
        chromosome[i] = Math.max(0, Math.min(1, chromosome[i] + mutation));
      }
    }
    
    const mutatedAgent: Agent = {
      ...agent,
      id: nanoid(),
      genetics: {
        chromosome,
        fitness: 0,
        generation: this.currentGeneration + 1
      },
      performanceMetrics: {
        accuracy: chromosome[1],
        efficiency: chromosome[2],
        adaptability: chromosome[5],
        learning_rate: chromosome[6]
      }
    };
    
    return mutatedAgent;
  }

  /**
   * Calculate convergence rate
   */
  private calculateConvergenceRate(): number {
    if (this.fitnessHistory.length < 10) return 0;
    
    const recent = this.fitnessHistory.slice(-10);
    const variance = recent.reduce((sum, fitness, index) => {
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
      return sum + Math.pow(fitness - mean, 2);
    }, 0) / recent.length;
    
    return 1 / (1 + variance); // Higher value means better convergence
  }

  /**
   * Generate insights from optimization results
   */
  private generateOptimizationInsights(population: Agent[]): string[] {
    const insights: string[] = [];
    const bestAgent = population.reduce((best, current) => 
      (current.genetics?.fitness || 0) > (best.genetics?.fitness || 0) ? current : best
    );
    
    insights.push(`Best performing agent achieved fitness score of ${(bestAgent.genetics?.fitness || 0).toFixed(3)}`);
    
    // Analyze performance patterns
    const avgAccuracy = population.reduce((sum, agent) => sum + (agent.performanceMetrics?.accuracy || 0), 0) / population.length;
    const avgEfficiency = population.reduce((sum, agent) => sum + (agent.performanceMetrics?.efficiency || 0), 0) / population.length;
    
    if (avgAccuracy > 0.8) {
      insights.push('High accuracy achieved across population - consider increasing task complexity');
    }
    
    if (avgEfficiency > 0.7) {
      insights.push('Excellent efficiency metrics - agents are well-optimized for current workload');
    }
    
    // Diversity analysis
    const chromosomeDiversity = this.calculatePopulationDiversity(population);
    if (chromosomeDiversity < 0.1) {
      insights.push('Low genetic diversity detected - consider increasing mutation rate');
    } else {
      insights.push('Good genetic diversity maintained throughout optimization');
    }
    
    insights.push(`Convergence rate: ${(this.calculateConvergenceRate() * 100).toFixed(1)}%`);
    
    return insights;
  }

  /**
   * Calculate population diversity
   */
  private calculatePopulationDiversity(population: Agent[]): number {
    const chromosomes = population.map(agent => agent.genetics!.chromosome);
    let totalDistance = 0;
    let comparisons = 0;
    
    for (let i = 0; i < chromosomes.length; i++) {
      for (let j = i + 1; j < chromosomes.length; j++) {
        const distance = this.euclideanDistance(chromosomes[i], chromosomes[j]);
        totalDistance += distance;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalDistance / comparisons : 0;
  }

  /**
   * Calculate Euclidean distance between two chromosomes
   */
  private euclideanDistance(chromosome1: number[], chromosome2: number[]): number {
    const squaredDifferences = chromosome1.map((value, index) => 
      Math.pow(value - chromosome2[index], 2)
    );
    return Math.sqrt(squaredDifferences.reduce((sum, value) => sum + value, 0));
  }

  /**
   * Apply optimized parameters to agents
   */
  async applyOptimizations(agents: Agent[], optimizationResult: OptimizationResult): Promise<Agent[]> {
    console.log('[CognitiveRefiner] Applying genetic algorithm optimizations');
    
    return agents.map(agent => {
      const optimizedAgent = optimizationResult.optimizedAgents.find(opt => opt.id === agent.id);
      if (optimizedAgent) {
        return {
          ...agent,
          healthScore: Math.min(1.0, agent.healthScore * 1.1), // Improve health
          successRate: Math.min(1.0, optimizedAgent.performanceMetrics?.accuracy || agent.successRate),
          averageResponseTime: Math.max(0.1, agent.averageResponseTime * 0.95), // Improve response time
          performanceMetrics: optimizedAgent.performanceMetrics
        };
      }
      return agent;
    });
  }

  /**
   * Get optimization status and progress
   */
  getOptimizationStatus() {
    return {
      currentGeneration: this.currentGeneration,
      populationSize: this.config.populationSize,
      fitnessHistory: this.fitnessHistory,
      convergenceRate: this.calculateConvergenceRate(),
      isOptimizing: this.currentGeneration > 0
    };
  }

  /**
   * Configure genetic algorithm parameters
   */
  updateConfig(newConfig: Partial<GeneticConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('[CognitiveRefiner] Configuration updated:', this.config);
  }
}

export const cognitiveRefinerService = new CognitiveRefinerService();