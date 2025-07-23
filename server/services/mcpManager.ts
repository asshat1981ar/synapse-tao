import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

interface McpServerConfig {
  name: string;
  path: string;
  runtime: string;
  framework?: string;
  entrypoint?: string;
  dependencies?: string[];
  port?: number;
}

export class McpManagerService {
  private discoveryPaths: string[] = [
    './synapse/backend',
    './backend',
    './services',
    './microservices'
  ];

  async discoverServers(): Promise<McpServerConfig[]> {
    const discovered: McpServerConfig[] = [];

    for (const basePath of this.discoveryPaths) {
      if (fs.existsSync(basePath)) {
        const servers = await this.scanDirectory(basePath);
        discovered.push(...servers);
      }
    }

    await this.logInfo('mcp-manager', `Discovered ${discovered.length} MCP servers`);
    return discovered;
  }

  private async scanDirectory(dirPath: string): Promise<McpServerConfig[]> {
    const servers: McpServerConfig[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dirPath, entry.name);
        const config = await this.analyzeDirectory(fullPath, entry.name);
        if (config) {
          servers.push(config);
        }
      }
    }

    return servers;
  }

  private async analyzeDirectory(dirPath: string, name: string): Promise<McpServerConfig | null> {
    const srcPath = path.join(dirPath, 'src');
    const mainPath = fs.existsSync(srcPath) ? srcPath : dirPath;

    // Check for Python Flask services
    if (fs.existsSync(path.join(mainPath, 'app.py')) || 
        fs.existsSync(path.join(mainPath, 'main.py')) ||
        fs.existsSync(path.join(dirPath, 'requirements.txt'))) {
      return {
        name,
        path: dirPath,
        runtime: 'python',
        framework: 'flask',
        entrypoint: this.findPythonEntrypoint(mainPath),
        dependencies: this.parsePythonRequirements(dirPath)
      };
    }

    // Check for Node.js Express services
    if (fs.existsSync(path.join(dirPath, 'package.json'))) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(dirPath, 'package.json'), 'utf8'));
      return {
        name,
        path: dirPath,
        runtime: 'node',
        framework: 'express',
        entrypoint: packageJson.main || 'index.js',
        dependencies: Object.keys(packageJson.dependencies || {})
      };
    }

    // Check for existing Docker services
    if (fs.existsSync(path.join(dirPath, 'Dockerfile'))) {
      return {
        name,
        path: dirPath,
        runtime: 'docker',
        framework: 'custom'
      };
    }

    return null;
  }

  private findPythonEntrypoint(dirPath: string): string {
    const candidates = ['app.py', 'main.py', 'server.py', 'run.py'];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(dirPath, candidate))) {
        return candidate;
      }
    }
    return 'app.py';
  }

  private parsePythonRequirements(dirPath: string): string[] {
    const reqPath = path.join(dirPath, 'requirements.txt');
    if (!fs.existsSync(reqPath)) return [];

    return fs.readFileSync(reqPath, 'utf8')
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
  }

  async buildDockerImage(serverId: string): Promise<string> {
    const server = await storage.getMcpServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    await storage.updateMcpServer(serverId, { status: 'building' });
    await this.logInfo('mcp-manager', `Building Docker image for ${server.name}`);

    try {
      const dockerImage = `synapse/${server.name}:latest`;
      const dockerfile = this.generateDockerfile(server);
      
      // Write Dockerfile
      fs.writeFileSync(path.join(server.path, 'Dockerfile'), dockerfile);
      
      // Build image
      execSync(`docker build -t ${dockerImage} ${server.path}`, { stdio: 'inherit' });
      
      await storage.updateMcpServer(serverId, { 
        status: 'deployed',
        dockerImage 
      });

      await this.logInfo('mcp-manager', `Successfully built Docker image: ${dockerImage}`);
      return dockerImage;
    } catch (error) {
      await storage.updateMcpServer(serverId, { status: 'failed' });
      await this.logError('mcp-manager', `Failed to build Docker image for ${server.name}: ${error.message}`);
      throw error;
    }
  }

  private generateDockerfile(server: any): string {
    switch (server.runtime) {
      case 'python':
        return this.generatePythonDockerfile(server);
      case 'node':
        return this.generateNodeDockerfile(server);
      default:
        throw new Error(`Unsupported runtime: ${server.runtime}`);
    }
  }

  private generatePythonDockerfile(server: any): string {
    return `FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

# Run the application
CMD ["python", "${server.entrypoint || 'app.py'}"]
`;
  }

  private generateNodeDockerfile(server: any): string {
    return `FROM node:18-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Run the application
CMD ["node", "${server.entrypoint || 'index.js'}"]
`;
  }

  async deployServer(serverId: string): Promise<void> {
    const server = await storage.getMcpServer(serverId);
    if (!server || !server.dockerImage) {
      throw new Error(`Server ${serverId} not ready for deployment`);
    }

    try {
      const port = await this.findAvailablePort();
      
      // Run container
      execSync(
        `docker run -d --name ${server.name} -p ${port}:5000 --restart unless-stopped ${server.dockerImage}`,
        { stdio: 'inherit' }
      );

      await storage.updateMcpServer(serverId, { 
        status: 'deployed',
        port 
      });

      await this.logInfo('mcp-manager', `Successfully deployed ${server.name} on port ${port}`);
    } catch (error) {
      await storage.updateMcpServer(serverId, { status: 'failed' });
      await this.logError('mcp-manager', `Failed to deploy ${server.name}: ${error.message}`);
      throw error;
    }
  }

  private async findAvailablePort(): Promise<number> {
    const usedPorts = (await storage.getAllMcpServers())
      .map(s => s.port)
      .filter(p => p !== null);
    
    for (let port = 5001; port <= 5100; port++) {
      if (!usedPorts.includes(port)) {
        return port;
      }
    }
    
    throw new Error('No available ports in range 5001-5100');
  }

  async stopServer(serverId: string): Promise<void> {
    const server = await storage.getMcpServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      execSync(`docker stop ${server.name}`, { stdio: 'inherit' });
      execSync(`docker rm ${server.name}`, { stdio: 'inherit' });
      
      await storage.updateMcpServer(serverId, { 
        status: 'discovered',
        port: null 
      });

      await this.logInfo('mcp-manager', `Stopped server ${server.name}`);
    } catch (error) {
      await this.logError('mcp-manager', `Failed to stop ${server.name}: ${error.message}`);
      throw error;
    }
  }

  async syncWithDatabase(): Promise<void> {
    const discovered = await this.discoverServers();
    const existing = await storage.getAllMcpServers();
    const existingPaths = new Set(existing.map(s => s.path));

    for (const config of discovered) {
      if (!existingPaths.has(config.path)) {
        await storage.createMcpServer({
          id: nanoid(),
          name: config.name,
          path: config.path,
          runtime: config.runtime,
          framework: config.framework || null,
          status: 'discovered',
          config: {
            entrypoint: config.entrypoint,
            dependencies: config.dependencies,
            port: config.port
          }
        });
      }
    }
  }

  private async logInfo(service: string, message: string): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'info',
        service,
        message,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log info:', error);
    }
  }

  private async logError(service: string, message: string): Promise<void> {
    try {
      await storage.createSystemLog({
        level: 'error',
        service,
        message,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }
}

export const mcpManagerService = new McpManagerService();
