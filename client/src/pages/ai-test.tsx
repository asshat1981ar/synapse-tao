import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bot, Zap, Code, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  responseTime: number;
}

interface TestResult {
  connected: boolean;
  model: string;
  responseTime?: number;
  error?: string;
}

export default function AITestPage() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('Hello! Can you introduce yourself and tell me what you can do?');
  const [maxTokens, setMaxTokens] = useState(150);
  const [systemPrompt, setSystemPrompt] = useState('');

  // DeepSeek mutations
  const deepseekChatMutation = useMutation({
    mutationFn: async ({ model }: { model: string }) => {
      const response = await fetch('/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          maxTokens,
          systemPrompt: systemPrompt || undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'DeepSeek API error');
      }
      
      return response.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: 'DeepSeek Response Received',
        description: `Tokens: ${data.usage?.total_tokens || 'N/A'}, Response time: ${data.responseTime.toFixed(2)}ms`
      });
    },
    onError: (error) => {
      toast({
        title: 'DeepSeek Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deepseekTestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/deepseek/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'DeepSeek test failed');
      }
      
      return response.json() as Promise<TestResult>;
    }
  });

  const deepseekCodeMutation = useMutation({
    mutationFn: async ({ language }: { language: string }) => {
      const response = await fetch('/api/deepseek/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          language,
          maxTokens: maxTokens * 2 // More tokens for code generation
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'DeepSeek code generation error');
      }
      
      return response.json();
    }
  });

  // OpenAI mutations
  const openaiChatMutation = useMutation({
    mutationFn: async ({ model }: { model: string }) => {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          maxTokens,
          systemPrompt: systemPrompt || undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OpenAI API error');
      }
      
      return response.json() as Promise<AIResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: 'OpenAI Response Received',
        description: `Tokens: ${data.usage?.total_tokens || 'N/A'}, Response time: ${data.responseTime.toFixed(2)}ms`
      });
    },
    onError: (error) => {
      toast({
        title: 'OpenAI Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const openaiTestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OpenAI test failed');
      }
      
      return response.json() as Promise<TestResult>;
    }
  });

  const openaiImageMutation = useMutation({
    mutationFn: async ({ model, size }: { model: string; size: string }) => {
      const response = await fetch('/api/openai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          size
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OpenAI image generation error');
      }
      
      return response.json();
    }
  });

  const deepseekModels = ['deepseek-chat', 'deepseek-coder', 'deepseek-v3', 'deepseek-reasoner'];
  const openaiModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  const programmingLanguages = ['javascript', 'python', 'typescript', 'react', 'nodejs'];
  const imageSizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Integration Testing
        </h1>
        <p className="text-muted-foreground">
          Test DeepSeek and OpenAI API integrations with live prompts and models
        </p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              DeepSeek Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Button 
                onClick={() => deepseekTestMutation.mutate()}
                disabled={deepseekTestMutation.isPending}
                variant="outline"
                size="sm"
              >
                {deepseekTestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              
              {deepseekTestMutation.data && (
                <div className="flex items-center gap-2">
                  {deepseekTestMutation.data.connected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={deepseekTestMutation.data.connected ? 'default' : 'destructive'}>
                    {deepseekTestMutation.data.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              )}
            </div>
            
            {deepseekTestMutation.data?.responseTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Response time: {deepseekTestMutation.data.responseTime.toFixed(2)}ms
              </p>
            )}
            
            {deepseekTestMutation.error && (
              <Alert className="mt-3">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{deepseekTestMutation.error.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              OpenAI Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Button 
                onClick={() => openaiTestMutation.mutate()}
                disabled={openaiTestMutation.isPending}
                variant="outline"
                size="sm"
              >
                {openaiTestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              
              {openaiTestMutation.data && (
                <div className="flex items-center gap-2">
                  {openaiTestMutation.data.connected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={openaiTestMutation.data.connected ? 'default' : 'destructive'}>
                    {openaiTestMutation.data.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              )}
            </div>
            
            {openaiTestMutation.data?.responseTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Response time: {openaiTestMutation.data.responseTime.toFixed(2)}ms
              </p>
            )}
            
            {openaiTestMutation.error && (
              <Alert className="mt-3">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{openaiTestMutation.error.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Input Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Input Configuration</CardTitle>
          <CardDescription>Configure your prompt and generation parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Prompt</label>
            <Textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">System Prompt (Optional)</label>
              <Input 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Max Tokens</label>
              <Input 
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 150)}
                min={10}
                max={4000}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Tabs */}
      <Tabs defaultValue="deepseek" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deepseek">DeepSeek AI</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
        </TabsList>

        <TabsContent value="deepseek" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chat Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Chat Testing
                </CardTitle>
                <CardDescription>Test DeepSeek chat models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {deepseekModels.map((model) => (
                    <Button
                      key={model}
                      onClick={() => deepseekChatMutation.mutate({ model })}
                      disabled={deepseekChatMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {deepseekChatMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {model.replace('deepseek-', '')}
                    </Button>
                  ))}
                </div>
                
                {deepseekChatMutation.data && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{deepseekChatMutation.data.model}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {deepseekChatMutation.data.responseTime.toFixed(2)}ms
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{deepseekChatMutation.data.content}</p>
                    {deepseekChatMutation.data.usage && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Tokens: {deepseekChatMutation.data.usage.total_tokens} 
                        ({deepseekChatMutation.data.usage.prompt_tokens} + {deepseekChatMutation.data.usage.completion_tokens})
                      </div>
                    )}
                  </div>
                )}
                
                {deepseekChatMutation.error && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{deepseekChatMutation.error.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Code Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Code Generation
                </CardTitle>
                <CardDescription>Test DeepSeek Coder capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {programmingLanguages.map((language) => (
                    <Button
                      key={language}
                      onClick={() => deepseekCodeMutation.mutate({ language })}
                      disabled={deepseekCodeMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {deepseekCodeMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {language}
                    </Button>
                  ))}
                </div>
                
                {deepseekCodeMutation.data && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">DeepSeek Coder</Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-semibold">Code:</h4>
                        <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                          <code>{deepseekCodeMutation.data.code}</code>
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Explanation:</h4>
                        <p className="text-sm">{deepseekCodeMutation.data.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {deepseekCodeMutation.error && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{deepseekCodeMutation.error.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="openai" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chat Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Chat Testing
                </CardTitle>
                <CardDescription>Test OpenAI GPT models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {openaiModels.map((model) => (
                    <Button
                      key={model}
                      onClick={() => openaiChatMutation.mutate({ model })}
                      disabled={openaiChatMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {openaiChatMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {model}
                    </Button>
                  ))}
                </div>
                
                {openaiChatMutation.data && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{openaiChatMutation.data.model}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {openaiChatMutation.data.responseTime.toFixed(2)}ms
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{openaiChatMutation.data.content}</p>
                    {openaiChatMutation.data.usage && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Tokens: {openaiChatMutation.data.usage.total_tokens} 
                        ({openaiChatMutation.data.usage.prompt_tokens} + {openaiChatMutation.data.usage.completion_tokens})
                      </div>
                    )}
                  </div>
                )}
                
                {openaiChatMutation.error && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{openaiChatMutation.error.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Image Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Image Generation
                </CardTitle>
                <CardDescription>Test DALL-E image generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Image Size</label>
                  <Select defaultValue="1024x1024">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageSizes.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={() => openaiImageMutation.mutate({ model: 'dall-e-3', size: '1024x1024' })}
                    disabled={openaiImageMutation.isPending}
                    variant="outline"
                  >
                    {openaiImageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate with DALL-E 3
                  </Button>
                </div>
                
                {openaiImageMutation.data && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{openaiImageMutation.data.model}</Badge>
                    </div>
                    <img 
                      src={openaiImageMutation.data.url} 
                      alt="Generated image"
                      className="w-full rounded-lg"
                    />
                    {openaiImageMutation.data.revised_prompt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Revised prompt: {openaiImageMutation.data.revised_prompt}
                      </p>
                    )}
                  </div>
                )}
                
                {openaiImageMutation.error && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{openaiImageMutation.error.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}