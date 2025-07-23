import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface SmitheryServer {
  id: string;
  name: string;
  description: string;
  author: string;
  keywords: string[];
  homepage?: string;
  transport: 'stdio' | 'shttp';
  tools: SmitheryTool[];
  config: SmitheryConfig[];
}

export interface SmitheryTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  examples?: Array<{ input: any; output: any }>;
}

export interface SmitheryConfig {
  key: string;
  type: 'secret' | 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
  default?: any;
}

export interface SmitherySearchParams {
  query?: string;
  keywords?: string[];
  transport?: 'stdio' | 'shttp';
  limit?: number;
  offset?: number;
}

export interface SmitherySearchResult {
  servers: SmitheryServer[];
  total: number;
  hasMore: boolean;
}

export interface SmitheryProjectSpec {
  id: string;
  name: string;
  description: string;
  author: string;
  keywords: string[];
  homepage?: string;
  transport: 'stdio' | 'shttp';
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    outputSchema: Record<string, any>;
    implementation: string;
  }>;
  config: SmitheryConfig[];
  dependencies?: string[];
}

export class SmitheryClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.smithery.ai';
  private readonly workspaceDir = './smithery_workspace';

  constructor() {
    this.apiKey = process.env.SMITHERY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('SMITHERY_API_KEY environment variable is required');
    }
    this.ensureWorkspace();
  }

  /**
   * Search Smithery registry for existing MCP servers
   */
  async searchServers(params: SmitherySearchParams): Promise<SmitherySearchResult> {
    try {
      logger.info('SmitheryClient', `Searching Smithery registry with query: ${params.query || 'all'}`);

      const searchParams = new URLSearchParams();
      if (params.query) searchParams.append('q', params.query);
      if (params.keywords) searchParams.append('keywords', params.keywords.join(','));
      if (params.transport) searchParams.append('transport', params.transport);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());

      const response = await fetch(`${this.baseUrl}/v1/servers/search?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info('SmitheryClient', `Found ${data.servers?.length || 0} servers in Smithery registry`);
      
      return {
        servers: data.servers || [],
        total: data.total || 0,
        hasMore: data.hasMore || false
      };
    } catch (error) {
      logger.error('SmitheryClient', `Error searching Smithery registry: ${(error as Error).message}`);
      return { servers: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get detailed information about a specific server
   */
  async getServerDetails(serverId: string): Promise<SmitheryServer | null> {
    try {
      logger.info('SmitheryClient', `Fetching details for server: ${serverId}`);

      const response = await fetch(`${this.baseUrl}/v1/servers/${serverId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Smithery API error: ${response.status} ${response.statusText}`);
      }

      const server = await response.json();
      logger.info('SmitheryClient', `Retrieved details for server: ${server.name}`);
      
      return server;
    } catch (error) {
      logger.error('SmitheryClient', `Error fetching server details: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Create a new Smithery MCP server project
   */
  async createSmitheryProject(spec: SmitheryProjectSpec): Promise<{
    projectPath: string;
    serverId: string;
    success: boolean;
    errors: string[];
  }> {
    const result = {
      projectPath: '',
      serverId: spec.id,
      success: false,
      errors: [] as string[]
    };

    try {
      logger.info('SmitheryClient', `Creating Smithery project: ${spec.name}`);

      // Create project directory
      const projectPath = path.join(this.workspaceDir, spec.id.replace('/', '-'));
      result.projectPath = projectPath;

      if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
      }
      fs.mkdirSync(projectPath, { recursive: true });

      // Initialize npm project
      await this.initializeNpmProject(projectPath, spec);

      // Create smithery.yaml manifest
      await this.createSmitheryManifest(projectPath, spec);

      // Generate TypeScript server code
      await this.generateServerCode(projectPath, spec);

      // Install dependencies
      await this.installDependencies(projectPath);

      // Build project
      await this.buildProject(projectPath);

      result.success = true;
      logger.info('SmitheryClient', `Successfully created Smithery project at: ${projectPath}`);

    } catch (error) {
      result.errors.push((error as Error).message);
      logger.error('SmitheryClient', `Error creating Smithery project: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Publish a Smithery MCP server to the registry
   */
  async publishServer(projectPath: string): Promise<{
    published: boolean;
    serverId?: string;
    url?: string;
    errors: string[];
  }> {
    const result = {
      published: false,
      errors: [] as string[]
    };

    try {
      logger.info('SmitheryClient', `Publishing Smithery server from: ${projectPath}`);

      // Login to Smithery CLI
      await this.smitheryCLI(projectPath, ['login', '--key', this.apiKey]);

      // Build the project
      await this.smitheryCLI(projectPath, ['build']);

      // Publish to registry
      const publishResult = await this.smitheryCLI(projectPath, ['publish']);
      
      // Parse publish result for server ID and URL
      const outputLines = publishResult.split('\n');
      for (const line of outputLines) {
        if (line.includes('Published server:')) {
          result.serverId = line.split('Published server:')[1].trim();
        }
        if (line.includes('Available at:')) {
          result.url = line.split('Available at:')[1].trim();
        }
      }

      result.published = true;
      logger.info('SmitheryClient', `Successfully published server: ${result.serverId}`);

    } catch (error) {
      result.errors.push((error as Error).message);
      logger.error('SmitheryClient', `Error publishing server: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Test a Smithery server locally
   */
  async testServerLocally(projectPath: string, testPrompt: string = 'what tools are available?'): Promise<{
    success: boolean;
    output: string;
    errors: string[];
  }> {
    const result = {
      success: false,
      output: '',
      errors: [] as string[]
    };

    try {
      logger.info('SmitheryClient', `Testing Smithery server locally with prompt: ${testPrompt}`);

      const output = await this.smitheryCLI(projectPath, ['dev', '--prompt', testPrompt]);
      result.output = output;
      result.success = true;

      logger.info('SmitheryClient', 'Local server test completed successfully');

    } catch (error) {
      result.errors.push((error as Error).message);
      logger.error('SmitheryClient', `Error testing server locally: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Find relevant tools for a given task context
   */
  async findRelevantTools(taskContext: {
    taskType: string;
    requirements: string[];
    keywords: string[];
  }): Promise<{
    exactMatches: SmitheryServer[];
    relatedMatches: SmitheryServer[];
    suggestions: string[];
  }> {
    const result = {
      exactMatches: [] as SmitheryServer[],
      relatedMatches: [] as SmitheryServer[],
      suggestions: [] as string[]
    };

    try {
      logger.info('SmitheryClient', `Finding relevant tools for task type: ${taskContext.taskType}`);

      // Search for exact keyword matches
      for (const keyword of taskContext.keywords) {
        const searchResult = await this.searchServers({
          query: keyword,
          limit: 10
        });
        result.exactMatches.push(...searchResult.servers);
      }

      // Search for task type related tools
      const taskTypeSearch = await this.searchServers({
        query: taskContext.taskType,
        limit: 15
      });
      result.relatedMatches.push(...taskTypeSearch.servers);

      // Search based on requirements
      for (const requirement of taskContext.requirements) {
        const reqSearch = await this.searchServers({
          query: requirement,
          limit: 5
        });
        result.relatedMatches.push(...reqSearch.servers);
      }

      // Remove duplicates
      result.exactMatches = this.removeDuplicateServers(result.exactMatches);
      result.relatedMatches = this.removeDuplicateServers(result.relatedMatches);

      // Generate suggestions based on gaps
      result.suggestions = this.generateToolSuggestions(taskContext, result.exactMatches, result.relatedMatches);

      logger.info('SmitheryClient', `Found ${result.exactMatches.length} exact matches, ${result.relatedMatches.length} related matches`);

    } catch (error) {
      logger.error('SmitheryClient', `Error finding relevant tools: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Generate tool specifications based on requirements analysis
   */
  async generateToolSpecifications(requirements: string[], existingTools: SmitheryServer[]): Promise<SmitheryTool[]> {
    const tools: SmitheryTool[] = [];

    try {
      logger.info('SmitheryClient', `Generating tool specifications for ${requirements.length} requirements`);

      // Analyze gaps in existing tools
      const coveredRequirements = this.analyzeCoverage(requirements, existingTools);
      const uncoveredRequirements = requirements.filter(req => !coveredRequirements.includes(req));

      // Generate tools for uncovered requirements
      for (const requirement of uncoveredRequirements) {
        const tool = this.generateToolFromRequirement(requirement);
        if (tool) {
          tools.push(tool);
        }
      }

      logger.info('SmitheryClient', `Generated ${tools.length} tool specifications`);

    } catch (error) {
      logger.error('SmitheryClient', `Error generating tool specifications: ${(error as Error).message}`);
    }

    return tools;
  }

  /**
   * Private helper methods
   */
  private ensureWorkspace(): void {
    if (!fs.existsSync(this.workspaceDir)) {
      fs.mkdirSync(this.workspaceDir, { recursive: true });
    }
    logger.info('SmitheryClient', `Smithery workspace ready: ${this.workspaceDir}`);
  }

  private async initializeNpmProject(projectPath: string, spec: SmitheryProjectSpec): Promise<void> {
    const packageJson = {
      name: spec.id.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      description: spec.description,
      main: 'build/index.cjs',
      scripts: {
        build: 'npx @smithery/cli build',
        dev: 'npx @smithery/cli dev',
        test: 'npx @smithery/cli inspect'
      },
      devDependencies: {
        typescript: '^5.0.0',
        'ts-node': '^10.9.0',
        '@smithery/typescript-sdk': 'latest',
        '@smithery/cli': 'latest',
        ...Object.fromEntries((spec.dependencies || []).map(dep => [dep, 'latest']))
      },
      keywords: spec.keywords,
      author: spec.author,
      homepage: spec.homepage
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async createSmitheryManifest(projectPath: string, spec: SmitheryProjectSpec): Promise<void> {
    const manifest = {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      author: spec.author,
      keywords: spec.keywords,
      homepage: spec.homepage,
      entry: 'build/index.cjs',
      transport: spec.transport,
      build: {
        command: 'npm run build',
        outDir: 'build'
      },
      config: spec.config
    };

    const yamlContent = this.objectToYaml(manifest);
    fs.writeFileSync(path.join(projectPath, 'smithery.yaml'), yamlContent);
  }

  private async generateServerCode(projectPath: string, spec: SmitheryProjectSpec): Promise<void> {
    const srcDir = path.join(projectPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const serverCode = this.generateTypeScriptServerCode(spec);
    fs.writeFileSync(path.join(srcDir, 'index.ts'), serverCode);

    // Generate tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'CommonJS',
        outDir: '../build',
        rootDir: '.',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      },
      include: ['**/*'],
      exclude: ['node_modules', '../build']
    };

    fs.writeFileSync(
      path.join(srcDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }

  private generateTypeScriptServerCode(spec: SmitheryProjectSpec): string {
    const toolsCode = spec.tools.map(tool => `
    ${tool.name}: {
      description: "${tool.description}",
      input: z.object(${JSON.stringify(tool.inputSchema).replace(/"([^"]+)":/g, '$1:')}),
      output: z.object(${JSON.stringify(tool.outputSchema).replace(/"([^"]+)":/g, '$1:')}),
      run: async (input, ctx) => {
        // TODO: Implement ${tool.name} logic
        ${tool.implementation}
        
        // Return mock response for now
        return { status: 'success', data: input };
      },
    }`).join(',\n');

    return `import { createServer, z } from "@smithery/typescript-sdk";

export const server = createServer({
  tools: {${toolsCode}
  },
});

server.listen();
`;
  }

  private async installDependencies(projectPath: string): Promise<void> {
    try {
      execSync('npm install', { 
        cwd: projectPath, 
        stdio: 'pipe'
      });
      logger.info('SmitheryClient', 'Dependencies installed successfully');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${(error as Error).message}`);
    }
  }

  private async buildProject(projectPath: string): Promise<void> {
    try {
      execSync('npm run build', { 
        cwd: projectPath, 
        stdio: 'pipe'
      });
      logger.info('SmitheryClient', 'Project built successfully');
    } catch (error) {
      throw new Error(`Failed to build project: ${(error as Error).message}`);
    }
  }

  private async smitheryCLI(projectPath: string, args: string[]): Promise<string> {
    try {
      const result = execSync(`npx @smithery/cli ${args.join(' ')}`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      return result.toString();
    } catch (error) {
      throw new Error(`Smithery CLI error: ${(error as Error).message}`);
    }
  }

  private removeDuplicateServers(servers: SmitheryServer[]): SmitheryServer[] {
    const seen = new Set<string>();
    return servers.filter(server => {
      if (seen.has(server.id)) {
        return false;
      }
      seen.add(server.id);
      return true;
    });
  }

  private generateToolSuggestions(
    taskContext: any,
    exactMatches: SmitheryServer[],
    relatedMatches: SmitheryServer[]
  ): string[] {
    const suggestions = [];
    
    if (exactMatches.length === 0) {
      suggestions.push(`No exact tools found for ${taskContext.taskType}, consider creating custom tools`);
    }
    
    if (relatedMatches.length > 0) {
      suggestions.push(`Found ${relatedMatches.length} related tools that might be adaptable`);
    }
    
    return suggestions;
  }

  private analyzeCoverage(requirements: string[], existingTools: SmitheryServer[]): string[] {
    const covered = [];
    
    for (const requirement of requirements) {
      for (const tool of existingTools) {
        if (tool.description.toLowerCase().includes(requirement.toLowerCase()) ||
            tool.tools.some(t => t.description.toLowerCase().includes(requirement.toLowerCase()))) {
          covered.push(requirement);
          break;
        }
      }
    }
    
    return covered;
  }

  private generateToolFromRequirement(requirement: string): SmitheryTool | null {
    // Simple tool generation based on requirement
    const toolName = requirement.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    return {
      name: toolName,
      description: `Tool to handle: ${requirement}`,
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input data' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'string', description: 'Processing result' }
        }
      }
    };
  }

  private objectToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n${this.objectToYaml(item, indent + 2)}`;
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else {
        yaml += `${spaces}${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
      }
    }
    
    return yaml;
  }
}

// Singleton instance
export const smitheryClient = new SmitheryClient();