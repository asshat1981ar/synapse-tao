import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useStableWebSocket } from '@/hooks/useStableWebSocket';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Bot, 
  Brain, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  BarChart3,
  Users,
  Database,
  Server,
  Shield,
  Eye,
  Settings,
  RefreshCcw,
  Play,
  Pause,
  Square,
  Download,
  Upload,
  GitBranch,
  Code,
  TestTube,
  Monitor,
  Bell,
  BellOff,
  Search,
  Filter,
  MoreVertical,
  ChevronDown,
  Info,
  AlertTriangle
} from 'lucide-react';

interface SystemMetrics {
  uptime: number;
  tasksCompleted: number;
  tasksFailed: number;
  averageResponseTime: number;
  systemEfficiency: number;
  memoryUsage: number;
  cpuUsage: number;
  activeAgents: number;
  queueSize: number;
  timestamp?: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'busy' | 'offline' | 'error';
  healthScore: number;
  successRate: number;
  averageResponseTime: number;
  totalTasks: number;
  capabilities: string[];
  currentTasks: string[];
  lastHeartbeat: string;
}

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  description: string;
  assignedAgent?: string;
  progress: number;
  qualityScore?: number;
  executionTime?: number;
  createdAt: string;
  completedAt?: string;
}

interface McpServer {
  id: string;
  name: string;
  path: string;
  runtime: string;
  framework?: string;
  status: 'discovered' | 'building' | 'deployed' | 'failed';
  port?: number;
  dockerImage?: string;
}

interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

interface SystemLog {
  id: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  service: string;
  message: string;
  timestamp: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('agents');
  const [logLevel, setLogLevel] = useState<string>('');
  
  // Real-time data state
  const [realtimeMetrics, setRealtimeMetrics] = useState<SystemMetrics | null>(null);
  const [realtimeAgents, setRealtimeAgents] = useState<Agent[]>([]);
  const [realtimeTasks, setRealtimeTasks] = useState<Task[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<SystemLog[]>([]);

  // WebSocket connection
  const { isConnected, subscribe, unsubscribe } = useStableWebSocket({
    onMessage: useCallback((message) => {
      switch (message.type) {
        case 'metrics_update':
          setRealtimeMetrics(message.data);
          queryClient.setQueryData(['system', 'metrics'], message.data);
          break;
        case 'agents_update':
          setRealtimeAgents(message.data);
          queryClient.setQueryData(['agents'], message.data);
          break;
        case 'tasks_update':
          setRealtimeTasks(message.data);
          queryClient.setQueryData(['tasks'], message.data);
          break;
        case 'logs_update':
          setRealtimeLogs(message.data);
          queryClient.setQueryData(['logs'], message.data);
          break;
        case 'alert_update':
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          if (message.data.action === 'created') {
            toast({
              title: message.data.alert.title,
              description: message.data.alert.message,
              variant: message.data.alert.type === 'error' ? 'destructive' : 'default'
            });
          }
          break;
      }
    }, [queryClient, toast]),
    onConnect: () => {
      toast({
        title: 'Connected',
        description: 'Real-time updates are now active'
      });
    },
    onDisconnect: () => {
      toast({
        title: 'Disconnected',
        description: 'Real-time updates are unavailable',
        variant: 'destructive'
      });
    }
  });

  // Auto-subscriptions handled by useStableWebSocket

  // API Queries
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['system', 'metrics'],
    queryFn: async () => {
      const response = await fetch('/api/system/metrics');
      if (!response.ok) throw new Error('Failed to fetch system metrics');
      return response.json();
    },
    refetchInterval: 30000
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    },
    refetchInterval: 15000
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    refetchInterval: 10000
  });

  const { data: mcpServers = [] } = useQuery({
    queryKey: ['mcp', 'servers'],
    queryFn: async () => {
      const response = await fetch('/api/mcp/servers');
      if (!response.ok) throw new Error('Failed to fetch MCP servers');
      return response.json();
    }
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const url = logLevel ? `/api/logs?limit=100&level=${logLevel}` : '/api/logs?limit=100';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    }
  });

  // Mutations
  const refreshMetricsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/system/metrics');
      if (!response.ok) throw new Error('Failed to refresh metrics');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'metrics'] });
      toast({ title: 'Success', description: 'Metrics refreshed successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to refresh metrics', variant: 'destructive' });
    }
  });

  const discoverServersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/mcp/discover', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to discover servers');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mcp', 'servers'] });
      toast({ 
        title: 'Discovery Complete', 
        description: `Discovered ${data.discovered} MCP servers` 
      });
    }
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  // Use real-time data if available, otherwise fallback to API data
  const currentMetrics = realtimeMetrics || systemMetrics;
  const currentAgents = realtimeAgents.length > 0 ? realtimeAgents : agents;
  const currentTasks = realtimeTasks.length > 0 ? realtimeTasks : tasks;
  const currentLogs = realtimeLogs.length > 0 ? realtimeLogs : logs;

  // Helper functions
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'busy': return 'bg-blue-500';
      case 'idle': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'deployed': return 'bg-green-500';
      case 'building': return 'bg-blue-500';
      case 'discovered': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'maestro': return <GitBranch className="h-4 w-4" />;
      case 'ai-integration': return <Brain className="h-4 w-4" />;
      case 'mcp-management': return <Server className="h-4 w-4" />;
      case 'project': return <BarChart3 className="h-4 w-4" />;
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'cognitive-refiner': return <TestTube className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500';
    if (priority >= 6) return 'bg-orange-500';
    if (priority >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLogLevel = (level: string) => {
    const colors = {
      error: 'text-red-400',
      warning: 'text-yellow-400',
      info: 'text-green-400',
      debug: 'text-blue-400'
    };
    return colors[level as keyof typeof colors] || 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-synapse-purple to-synapse-cyan flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <h1 className="ml-3 text-xl font-bold gradient-text">Synapse AI</h1>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-6">
                <button 
                  onClick={() => setActiveTab('agents')}
                  className={`px-1 pb-4 text-sm font-medium border-b-2 ${
                    activeTab === 'agents' 
                      ? 'text-white border-b-synapse-purple' 
                      : 'text-slate-400 hover:text-white border-transparent'
                  }`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('agents')}
                  className="text-slate-400 hover:text-white px-1 pb-4 text-sm font-medium"
                >
                  Agents
                </button>
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className="text-slate-400 hover:text-white px-1 pb-4 text-sm font-medium"
                >
                  Tasks
                </button>
                <button 
                  onClick={() => setActiveTab('mcp')}
                  className="text-slate-400 hover:text-white px-1 pb-4 text-sm font-medium"
                >
                  MCP Servers
                </button>
                <button 
                  onClick={() => setActiveTab('logs')}
                  className="text-slate-400 hover:text-white px-1 pb-4 text-sm font-medium"
                >
                  Analytics
                </button>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 status-pulse' : 'bg-red-500'}`} />
                <span>
                  {isConnected ? 'All Systems Operational' : 'Connection Lost'}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">System Overview</h2>
              <p className="text-slate-400">Real-time monitoring of your AI orchestration platform</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 status-pulse' : 'bg-red-500'}`} />
                <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'All Systems Operational' : 'Connection Issues'}
                </span>
              </div>
              <Button 
                onClick={() => window.location.href = '/ide'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Code className="h-4 w-4 mr-2" />
                Open IDE
              </Button>
              <Button 
                onClick={() => refreshMetricsMutation.mutate()}
                disabled={refreshMetricsMutation.isPending}
                variant="outline"
                className="border-synapse-cyan text-synapse-cyan hover:bg-synapse-cyan hover:text-black"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${refreshMetricsMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* System Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* System Status Card */}
            <Card className="glass-card metric-glow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">System Status</CardTitle>
                <Activity className="h-5 w-5 text-synapse-purple" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="text-2xl font-bold text-white">
                      {currentMetrics ? 'Operational' : 'Loading...'}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Uptime: {currentMetrics ? formatUptime(currentMetrics.uptime) : 'N/A'}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Efficiency</span>
                      <span className="text-white">
                        {currentMetrics ? (currentMetrics.systemEfficiency * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                    <Progress 
                      value={currentMetrics ? currentMetrics.systemEfficiency * 100 : 0} 
                      className="h-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Processed Card */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Tasks Processed</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-white">
                    {currentMetrics ? formatNumber(currentMetrics.tasksCompleted) : '0'}
                  </div>
                  <p className="text-xs text-slate-400">
                    {currentMetrics ? currentMetrics.tasksFailed : 0} failed ({currentMetrics ? 
                      ((currentMetrics.tasksFailed / (currentMetrics.tasksCompleted + currentMetrics.tasksFailed)) * 100).toFixed(1)
                      : '0'}%)
                  </p>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-green-400">↗ +12.5%</span>
                    <span className="text-slate-400">vs last hour</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Performance</CardTitle>
                <TrendingUp className="h-5 w-5 text-synapse-cyan" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-white">
                    {currentMetrics ? currentMetrics.averageResponseTime.toFixed(1) : '0'}s
                  </div>
                  <p className="text-xs text-slate-400">Average response time</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">CPU</span>
                      <span className="text-white">{currentMetrics ? currentMetrics.cpuUsage : 0}%</span>
                    </div>
                    <Progress value={currentMetrics?.cpuUsage || 0} className="h-1" />
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Memory</span>
                      <span className="text-white">{currentMetrics ? currentMetrics.memoryUsage : 0}%</span>
                    </div>
                    <Progress value={currentMetrics?.memoryUsage || 0} className="h-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Resources Card */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Active Resources</CardTitle>
                <Bot className="h-5 w-5 text-synapse-purple" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Agents</span>
                    <Badge className="bg-synapse-purple/20 text-synapse-purple">
                      {currentMetrics ? currentMetrics.activeAgents : currentAgents.length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Queue Size</span>
                    <Badge variant="outline">
                      {currentMetrics ? currentMetrics.queueSize : 0}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600/20 text-green-400 hover:bg-green-600/30">
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                    <Button size="sm" className="flex-1 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30">
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-dark-border">
            <TabsList className="bg-transparent h-auto p-0 space-x-8">
              <TabsTrigger 
                value="agents" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-synapse-purple data-[state=active]:text-synapse-purple bg-transparent"
              >
                Agent Management
              </TabsTrigger>
              <TabsTrigger 
                value="tasks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-synapse-purple data-[state=active]:text-synapse-purple bg-transparent"
              >
                Task Queue
              </TabsTrigger>
              <TabsTrigger 
                value="mcp"
                className="data-[state=active]:border-b-2 data-[state=active]:border-synapse-purple data-[state=active]:text-synapse-purple bg-transparent"
              >
                MCP Servers
              </TabsTrigger>
              <TabsTrigger 
                value="logs"
                className="data-[state=active]:border-b-2 data-[state=active]:border-synapse-purple data-[state=state=active]:text-synapse-purple bg-transparent"
              >
                System Logs
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className="data-[state=active]:border-b-2 data-[state=active]:border-synapse-purple data-[state=active]:text-synapse-purple bg-transparent"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Agent Management Tab */}
          <TabsContent value="agents" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agents List */}
            <div className="lg:col-span-2">
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Active Agents
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Monitor and control your autonomous development agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {agentsLoading ? (
                    <div className="text-center py-8">Loading agents...</div>
                  ) : currentAgents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No agents found</div>
                  ) : (
                    <div className="space-y-4">
                      {currentAgents.map((agent) => (
                        <div key={agent.id} className="bg-dark-bg/50 rounded-lg p-4 border border-dark-border hover:border-synapse-purple/50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                agent.type === 'maestro' ? 'bg-synapse-purple/20' :
                                agent.type === 'ai-integration' ? 'bg-synapse-cyan/20' :
                                agent.type === 'mcp-management' ? 'bg-green-500/20' :
                                'bg-blue-500/20'
                              }`}>
                                <div className={
                                  agent.type === 'maestro' ? 'text-synapse-purple' :
                                  agent.type === 'ai-integration' ? 'text-synapse-cyan' :
                                  agent.type === 'mcp-management' ? 'text-green-500' :
                                  'text-blue-500'
                                }>
                                  {getAgentIcon(agent.type)}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium text-white">{agent.id}</h4>
                                <p className="text-xs text-slate-400 capitalize">{agent.type.replace('-', ' ')}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                              <Badge className={
                                agent.status === 'busy' ? 'bg-blue-500/20 text-blue-400' :
                                agent.status === 'idle' ? 'bg-green-500/20 text-green-400' :
                                'bg-gray-500/20 text-gray-400'
                              }>
                                {agent.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-slate-400">Success Rate</span>
                              <div className="text-white font-medium">
                                {(agent.successRate * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400">Avg Response</span>
                              <div className="text-white font-medium">
                                {agent.averageResponseTime.toFixed(1)}s
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400">Health Score</span>
                              <div className="text-green-400 font-medium">
                                {(agent.healthScore * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>

                          {agent.currentTasks.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-slate-400 mb-1">
                                Current Tasks: {agent.currentTasks.length}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {agent.currentTasks.map((taskId) => (
                                  <Badge key={taskId} variant="secondary" className="text-xs">
                                    {taskId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Side Panel - Task Queue and Alerts */}
            <div className="space-y-6">
              {/* Task Queue Status */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Task Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentTasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-dark-bg/50 rounded-lg border border-dark-border">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                          <div>
                            <div className="text-sm font-medium text-white truncate max-w-[120px]">
                              {task.description}
                            </div>
                            <div className="text-xs text-slate-400">Priority: {task.priority}</div>
                          </div>
                        </div>
                        <Badge className={`text-xs ${
                          task.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {task.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Alerts */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <BellOff className="h-8 w-8 mx-auto mb-2" />
                        <p>No alerts at this time</p>
                      </div>
                    ) : (
                      alerts.slice(0, 3).map((alert) => (
                        <Alert key={alert.id} className={alert.acknowledged ? 'opacity-60' : ''}>
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{alert.title}</h4>
                                {!alert.acknowledged && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                  >
                                    Acknowledge
                                  </Button>
                                )}
                              </div>
                              <AlertDescription className="mt-1">
                                {alert.message}
                              </AlertDescription>
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(alert.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </Alert>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Task Monitoring Tab */}
          <TabsContent value="tasks">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Task Monitoring
                </CardTitle>
                <CardDescription>
                  Real-time task execution and performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="text-center py-8">Loading tasks...</div>
                ) : currentTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No tasks found</div>
                ) : (
                  <div className="space-y-4">
                    {currentTasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4 border-dark-border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getTaskIcon(task.status)}
                            <div>
                              <div className="font-medium text-white">{task.description}</div>
                              <div className="text-sm text-slate-400">
                                {task.type} • {task.id}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                            <Badge variant="outline">P{task.priority}</Badge>
                          </div>
                        </div>

                        {task.status === 'running' && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">Created</div>
                            <div className="font-medium">
                              {new Date(task.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">Agent</div>
                            <div className="font-medium">
                              {task.assignedAgent || 'Unassigned'}
                            </div>
                          </div>
                          {task.qualityScore && (
                            <div>
                              <div className="text-slate-400">Quality</div>
                              <div className="font-medium">
                                {(task.qualityScore * 100).toFixed(0)}%
                              </div>
                            </div>
                          )}
                          {task.executionTime && (
                            <div>
                              <div className="text-slate-400">Execution Time</div>
                              <div className="font-medium">
                                {task.executionTime}s
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Servers Tab */}
          <TabsContent value="mcp">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      MCP Server Management
                    </CardTitle>
                    <CardDescription>
                      Automatic discovery and Docker deployment
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      onClick={() => discoverServersMutation.mutate()}
                      disabled={discoverServersMutation.isPending}
                      className="bg-gradient-to-r from-synapse-purple to-synapse-cyan hover:shadow-lg transition-all duration-200"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Discover Servers
                    </Button>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Deploy All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {mcpServers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No MCP servers found. Click "Discover Servers" to scan for services.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Server Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Runtime</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Framework</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Path</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {mcpServers.map((server) => (
                          <tr key={server.id} className="hover:bg-dark-bg/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-synapse-purple/20 rounded-lg">
                                  <Server className="h-4 w-4 text-synapse-purple" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">{server.name}</div>
                                  <div className="text-xs text-slate-400">ID: {server.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={
                                server.status === 'deployed' ? 'bg-green-500/20 text-green-400' :
                                server.status === 'building' ? 'bg-blue-500/20 text-blue-400' :
                                server.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }>
                                {server.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded ${
                                  server.runtime === 'python' ? 'bg-blue-500' :
                                  server.runtime === 'node' ? 'bg-green-500' :
                                  'bg-gray-500'
                                }`} />
                                <span className="text-sm text-white capitalize">{server.runtime}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-white capitalize">{server.framework || 'N/A'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-xs text-slate-400 font-mono">{server.path}</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                {server.status === 'discovered' ? (
                                  <Button 
                                    size="sm" 
                                    className="bg-gradient-to-r from-synapse-purple to-synapse-cyan hover:shadow-lg transition-all text-xs"
                                  >
                                    Build & Deploy
                                  </Button>
                                ) : server.status === 'deployed' ? (
                                  <>
                                    <Button variant="ghost" size="sm">
                                      <Play className="h-4 w-4 text-green-400" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <Square className="h-4 w-4 text-red-400" />
                                    </Button>
                                  </>
                                ) : server.status === 'building' ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-blue-400">Building...</span>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    System Logs
                  </CardTitle>
                  <div className="flex items-center space-x-3">
                    <Select value={logLevel} onValueChange={setLogLevel}>
                      <SelectTrigger className="w-[150px] bg-dark-border">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Levels</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-dark-bg rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                  {currentLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No logs available</div>
                  ) : (
                    <div className="space-y-1">
                      {currentLogs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-3">
                          <span className="text-slate-500 text-xs shrink-0">
                            {new Date(log.timestamp).toISOString().slice(0, 19).replace('T', ' ')}
                          </span>
                          <span className={`text-xs font-medium shrink-0 ${formatLogLevel(log.level)}`}>
                            [{log.level.toUpperCase()}]
                          </span>
                          <span className="text-slate-300 text-xs">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>Key performance indicators over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-400">
                    Analytics dashboard coming soon...
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Agent Efficiency</CardTitle>
                  <CardDescription>Agent performance metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-400">
                    Agent analytics coming soon...
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
