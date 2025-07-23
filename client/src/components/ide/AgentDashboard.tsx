import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Pause, 
  Play, 
  RefreshCw,
  Settings,
  TrendingUp,
  Zap
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  healthScore: number;
  successRate: number;
  averageResponseTime: number;
  totalTasks: number;
  currentTasks: string[];
  capabilities: string[];
  lastHeartbeat: string;
}

export function AgentDashboard() {
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  const { data: agents = [], refetch: refetchAgents } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 5000,
  });

  const { data: systemMetrics } = useQuery({
    queryKey: ['/api/system/metrics'],
    refetchInterval: 5000,
  });

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'idle': return 'bg-blue-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />;
      case 'busy': return <Activity className="h-4 w-4" />;
      case 'idle': return <Pause className="h-4 w-4" />;
      case 'offline': return <AlertCircle className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const formatUptime = (timestamp: string) => {
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const restartAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/restart`, {
        method: 'POST',
      });
      
      if (response.ok) {
        refetchAgents();
      }
    } catch (error) {
      console.error('Failed to restart agent:', error);
    }
  };

  const pauseAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/pause`, {
        method: 'POST',
      });
      
      if (response.ok) {
        refetchAgents();
      }
    } catch (error) {
      console.error('Failed to pause agent:', error);
    }
  };

  const selectedAgentData = agents.find((agent: Agent) => agent.id === selectedAgent);

  return (
    <div className="h-full bg-slate-850 text-slate-300">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">Agents</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-700"
              onClick={() => refetchAgents()}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-slate-700"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* System overview */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800 rounded p-2">
            <div className="text-slate-400">Active Agents</div>
            <div className="text-lg font-semibold text-white">
              {agents.filter((a: Agent) => a.status !== 'offline').length}
            </div>
          </div>
          <div className="bg-slate-800 rounded p-2">
            <div className="text-slate-400">System Load</div>
            <div className="text-lg font-semibold text-white">
              {systemMetrics ? `${systemMetrics.cpuUsage}%` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Agent list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {agents.map((agent: Agent) => (
            <Card 
              key={agent.id}
              className={`bg-slate-800 border-slate-700 cursor-pointer transition-colors hover:bg-slate-750 ${
                selectedAgent === agent.id ? 'ring-1 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedAgent(agent.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                    <span className="font-medium text-sm text-slate-200">{agent.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(agent.status)}
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {agent.type}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Health:</span>
                    <span className="text-slate-300">{(agent.healthScore * 100).toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={agent.healthScore * 100} 
                    className="h-1"
                  />
                  
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="text-slate-300">{(agent.successRate * 100).toFixed(0)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className="text-slate-300">{agent.averageResponseTime.toFixed(1)}s</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Tasks:</span>
                    <span className="text-slate-300">{agent.totalTasks}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Last Seen:</span>
                    <span className="text-slate-300">{formatUptime(agent.lastHeartbeat)}</span>
                  </div>
                </div>

                {agent.currentTasks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400">
                      Current: {agent.currentTasks.length} task{agent.currentTasks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {agents.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No agents found</p>
              <p className="text-xs mt-1">Agents will appear here when they come online</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Agent details panel */}
      {selectedAgentData && (
        <div className="border-t border-slate-700 bg-slate-800">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-200">
                {selectedAgentData.name}
              </h4>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-slate-700"
                  onClick={() => restartAgent(selectedAgentData.id)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-slate-700"
                  onClick={() => pauseAgent(selectedAgentData.id)}
                >
                  {selectedAgentData.status === 'busy' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Status:</span>
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs border-slate-600 ${
                    selectedAgentData.status === 'online' ? 'text-green-400' :
                    selectedAgentData.status === 'busy' ? 'text-yellow-400' :
                    selectedAgentData.status === 'idle' ? 'text-blue-400' :
                    'text-red-400'
                  }`}
                >
                  {selectedAgentData.status}
                </Badge>
              </div>

              <div>
                <span className="text-slate-400">Capabilities:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedAgentData.capabilities.map((capability, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="text-xs border-slate-600 text-slate-300"
                    >
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedAgentData.currentTasks.length > 0 && (
                <div>
                  <span className="text-slate-400">Current Tasks:</span>
                  <div className="mt-1 space-y-1">
                    {selectedAgentData.currentTasks.map((task, index) => (
                      <div key={index} className="text-slate-300 bg-slate-700 rounded px-2 py-1">
                        {task}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-700">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Performance Trend</span>
                  <TrendingUp className="h-3 w-3 text-green-400" />
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  {selectedAgentData.successRate > 0.9 ? 'Excellent' :
                   selectedAgentData.successRate > 0.8 ? 'Good' :
                   selectedAgentData.successRate > 0.7 ? 'Fair' : 'Needs Attention'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}