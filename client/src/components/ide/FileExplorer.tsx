import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
  content?: string;
  language?: string;
}

interface FileExplorerProps {
  onFileOpen: (file: { name: string; path: string; content: string; language: string }) => void;
}

export function FileExplorer({ onFileOpen }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [isCreating, setIsCreating] = useState<{ parentId: string; type: 'file' | 'folder' } | null>(null);
  const [newName, setNewName] = useState('');
  const { toast } = useToast();

  // Initialize with sample project structure
  useEffect(() => {
    const sampleFiles: FileNode[] = [
      {
        id: 'root',
        name: 'Synapse AI Project',
        path: '/',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'client',
            name: 'client',
            path: '/client',
            type: 'folder',
            isOpen: true,
            children: [
              {
                id: 'src',
                name: 'src',
                path: '/client/src',
                type: 'folder',
                isOpen: true,
                children: [
                  {
                    id: 'components',
                    name: 'components',
                    path: '/client/src/components',
                    type: 'folder',
                    children: [
                      {
                        id: 'app-tsx',
                        name: 'App.tsx',
                        path: '/client/src/App.tsx',
                        type: 'file',
                        language: 'typescript',
                        content: `import { Route, Switch } from 'wouter';
import { Dashboard } from './pages/dashboard';
import { IDELayout } from './components/ide/IDELayout';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/ide" component={IDELayout} />
        <Route>404 - Page Not Found</Route>
      </Switch>
      <Toaster />
    </div>
  );
}

export default App;`
                      }
                    ]
                  },
                  {
                    id: 'pages',
                    name: 'pages',
                    path: '/client/src/pages',
                    type: 'folder',
                    children: [
                      {
                        id: 'dashboard-tsx',
                        name: 'dashboard.tsx',
                        path: '/client/src/pages/dashboard.tsx',
                        type: 'file',
                        language: 'typescript',
                        content: `import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Bot, Cpu, Zap } from 'lucide-react';

export function Dashboard() {
  const { data: systemMetrics } = useQuery({
    queryKey: ['/api/system/metrics'],
    refetchInterval: 5000,
  });

  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Synapse AI Dashboard</h1>
          <p className="text-slate-300">Multi-agent orchestration platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">System Efficiency</CardTitle>
              <Activity className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {systemMetrics ? \`\${(systemMetrics.systemEfficiency * 100).toFixed(1)}%\` : '--'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Active Agents</CardTitle>
              <Bot className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {agents ? agents.length : '--'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {systemMetrics ? \`\${systemMetrics.cpuUsage}%\` : '--'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Tasks Completed</CardTitle>
              <Zap className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {systemMetrics ? systemMetrics.tasksCompleted : '--'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.href = '/ide'}
          >
            Open IDE
          </Button>
        </div>
      </div>
    </div>
  );
}`
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: 'server',
            name: 'server',
            path: '/server',
            type: 'folder',
            children: [
              {
                id: 'index-ts',
                name: 'index.ts',
                path: '/server/index.ts',
                type: 'file',
                language: 'typescript',
                content: `import express from 'express';
import { registerRoutes } from './routes';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const server = await registerRoutes(app);
  
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
  });
}

startServer().catch(console.error);`
              }
            ]
          },
          {
            id: 'readme-md',
            name: 'README.md',
            path: '/README.md',
            type: 'file',
            language: 'markdown',
            content: `# Synapse AI - Multi-Agent Orchestration Platform

A sophisticated multi-agent AI workflow orchestration platform with enterprise-grade features.

## Features

- 🤖 Multi-agent coordination and task orchestration
- 🧠 Advanced AI integration (OpenAI, Anthropic, DeepSeek, BlackboxAI)
- 🔄 Real-time collaborative workflow editing
- 📊 ML-powered predictive analytics
- 🎯 Genetic algorithm optimization for agent performance
- 💬 Intelligent project decomposition and coordination
- 🔗 WebSocket-based real-time communication
- 📝 Integrated IDE with chat capabilities

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open your browser to \`http://localhost:5000\`

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **AI**: Multi-provider integration with fallback chains

## License

MIT License`
          }
        ]
      }
    ];

    setFileTree(sampleFiles);
  }, []);

  const toggleFolder = (nodeId: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    setFileTree(updateNode(fileTree));
  };

  const handleNodeClick = (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      setSelectedNode(node.id);
      onFileOpen({
        name: node.name,
        path: node.path,
        content: node.content || '',
        language: node.language || 'plaintext'
      });
    }
  };

  const createNewItem = async (parentId: string, type: 'file' | 'folder') => {
    setIsCreating({ parentId, type });
    setNewName('');
  };

  const confirmCreate = async () => {
    if (!newName.trim() || !isCreating) return;

    try {
      const newNode: FileNode = {
        id: `${isCreating.parentId}-${Date.now()}`,
        name: newName,
        path: `${isCreating.parentId}/${newName}`,
        type: isCreating.type,
        content: isCreating.type === 'file' ? '' : undefined,
        children: isCreating.type === 'folder' ? [] : undefined
      };

      // Add to parent node
      const updateTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === isCreating.parentId) {
            return {
              ...node,
              children: [...(node.children || []), newNode],
              isOpen: true
            };
          }
          if (node.children) {
            return { ...node, children: updateTree(node.children) };
          }
          return node;
        });
      };

      setFileTree(updateTree(fileTree));
      setIsCreating(null);
      setNewName('');

      toast({
        title: "Created successfully",
        description: `${isCreating.type} "${newName}" has been created.`,
      });
    } catch (error) {
      toast({
        title: "Creation failed",
        description: `Failed to create ${isCreating.type}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const cancelCreate = () => {
    setIsCreating(null);
    setNewName('');
  };

  const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isSelected = selectedNode === node.id;
    const isFolder = node.type === 'folder';
    const isOpen = node.isOpen;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-slate-700 cursor-pointer text-sm ${
            isSelected ? 'bg-slate-700 text-blue-400' : 'text-slate-300'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {isFolder && (
            <div className="mr-1">
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          )}
          
          <div className="mr-2">
            {isFolder ? (
              isOpen ? (
                <FolderOpen className="h-4 w-4 text-blue-400" />
              ) : (
                <Folder className="h-4 w-4 text-blue-400" />
              )
            ) : (
              <File className="h-4 w-4 text-slate-400" />
            )}
          </div>
          
          <span className="flex-1 truncate">{node.name}</span>
          
          {isFolder && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  createNewItem(node.id, 'file');
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {isCreating?.parentId === node.id && (
          <div
            className="flex items-center py-1 px-2 bg-slate-800"
            style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
          >
            <div className="mr-2">
              {isCreating.type === 'folder' ? (
                <Folder className="h-4 w-4 text-blue-400" />
              ) : (
                <File className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreate();
                if (e.key === 'Escape') cancelCreate();
              }}
              onBlur={confirmCreate}
              placeholder={`New ${isCreating.type} name...`}
              className="h-6 text-xs bg-slate-700 border-slate-600"
              autoFocus
            />
          </div>
        )}

        {isFolder && isOpen && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-850 text-slate-300">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Explorer</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-700"
              onClick={() => createNewItem('root', 'file')}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-700"
              onClick={() => createNewItem('root', 'folder')}
            >
              <Folder className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-auto h-full group">
        {fileTree.map(node => renderNode(node))}
      </div>
    </div>
  );
}