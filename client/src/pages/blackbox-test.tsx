import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, TestTube, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Navigation } from '@/components/navigation';

interface BlackboxTestResult {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface BlackboxConnectionTest {
  connected: boolean;
  models: string[];
  timestamp: string;
}

export default function BlackboxTest() {
  const [prompt, setPrompt] = useState("What's the capital of France?");
  const [selectedModel, setSelectedModel] = useState('blackboxai/deepseek/deepseek-v3-base:free');
  const [maxTokens, setMaxTokens] = useState(100);
  const [temperature, setTemperature] = useState(0.7);

  // Get available models
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/blackbox/models'],
    retry: false
  });

  // Test connection
  const { data: connectionTest, isLoading: testLoading, refetch: testConnection } = useQuery({
    queryKey: ['/api/blackbox/test'],
    retry: false
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/blackbox/chat', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const handleSendPrompt = () => {
    chatMutation.mutate({
      prompt,
      model: selectedModel,
      maxTokens,
      temperature
    });
  };

  const availableModels = modelsData?.models || [
    'blackboxai/deepseek/deepseek-v3-base:free',
    'blackboxai/llama-3.1-8b:free',
    'blackboxai/llama-3.1-70b:free',
    'blackboxai/gemma-7b:free',
    'blackboxai/mistral-7b:free',
    'blackboxai/qwen-2.5-coder-32b:free'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <Navigation />
      <div className="max-w-6xl mx-auto pt-24">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Zap className="h-8 w-8 text-yellow-500" />
            BlackboxAI Integration Test
          </h1>
          <p className="text-gray-300 text-lg">
            Test BlackboxAI's free models integration in Synapse AI platform
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Status Card */}
          <Card className="bg-black/40 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">API Status:</span>
                {testLoading ? (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Testing...
                  </Badge>
                ) : connectionTest?.connected ? (
                  <Badge className="bg-green-600">Connected</Badge>
                ) : (
                  <Badge variant="destructive">Disconnected</Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Available Models:</span>
                <Badge variant="outline" className="text-purple-300 border-purple-500">
                  {modelsLoading ? '...' : availableModels.length}
                </Badge>
              </div>
              
              {connectionTest?.timestamp && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Last Tested:</span>
                  <span className="text-sm text-gray-400">
                    {new Date(connectionTest.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              <Button 
                onClick={() => testConnection()}
                disabled={testLoading}
                variant="outline"
                className="w-full border-purple-500 text-purple-300 hover:bg-purple-900/50"
              >
                {testLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </CardContent>
          </Card>

          {/* Models Card */}
          <Card className="bg-black/40 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white">Available Free Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableModels.map((model: string) => (
                  <div
                    key={model}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedModel === model
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-600 hover:border-purple-400'
                    }`}
                    onClick={() => setSelectedModel(model)}
                  >
                    <div className="text-sm font-medium text-white">{model.split('/').pop()}</div>
                    <div className="text-xs text-gray-400">{model}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="mt-6 bg-black/40 border-purple-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Send className="h-5 w-5" />
              Chat Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="model" className="text-gray-300">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-gray-600">
                    {availableModels.map((model: string) => (
                      <SelectItem key={model} value={model} className="text-white">
                        {model.split('/').pop()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maxTokens" className="text-gray-300">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="bg-black/50 border-gray-600 text-white"
                  min={1}
                  max={2000}
                />
              </div>
              
              <div>
                <Label htmlFor="temperature" className="text-gray-300">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="bg-black/50 border-gray-600 text-white"
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="prompt" className="text-gray-300">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-black/50 border-gray-600 text-white min-h-[100px]"
                placeholder="Enter your prompt here..."
              />
            </div>

            <Button
              onClick={handleSendPrompt}
              disabled={chatMutation.isPending || !prompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Prompt
            </Button>
          </CardContent>
        </Card>

        {/* Response Card */}
        {(chatMutation.data || chatMutation.error) && (
          <Card className="mt-6 bg-black/40 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white">Response</CardTitle>
            </CardHeader>
            <CardContent>
              {chatMutation.error ? (
                <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-300 font-medium">Error:</p>
                  <p className="text-red-200">{(chatMutation.error as Error).message}</p>
                </div>
              ) : chatMutation.data ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                    <p className="text-green-300 font-medium mb-2">Response from {chatMutation.data.model}:</p>
                    <p className="text-white whitespace-pre-wrap">{chatMutation.data.content}</p>
                  </div>
                  
                  {chatMutation.data.usage && (
                    <div className="flex gap-4 text-sm">
                      <Badge variant="secondary">
                        Prompt: {chatMutation.data.usage.prompt_tokens} tokens
                      </Badge>
                      <Badge variant="secondary">
                        Completion: {chatMutation.data.usage.completion_tokens} tokens
                      </Badge>
                      <Badge variant="secondary">
                        Total: {chatMutation.data.usage.total_tokens} tokens
                      </Badge>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Example Prompts */}
        <Card className="mt-6 bg-black/40 border-purple-500/50">
          <CardHeader>
            <CardTitle className="text-white">Example Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "What's the capital of France?",
                "Write a simple Python function to calculate fibonacci numbers",
                "Explain quantum computing in simple terms",
                "Create a JavaScript function to validate email addresses",
                "What are the benefits of renewable energy?",
                "Write a SQL query to find the top 10 customers by sales"
              ].map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => setPrompt(example)}
                  className="text-left h-auto p-3 border-gray-600 text-gray-300 hover:border-purple-400 hover:text-white"
                >
                  {example}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}