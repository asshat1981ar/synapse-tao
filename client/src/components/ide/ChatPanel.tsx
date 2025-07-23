import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bot, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  name: string;
  agent: string;
  messages: ChatMessage[];
}

interface ChatPanelProps {
  sessions: ChatSession[];
  activeSession: string;
  onSessionChange: (sessionId: string) => void;
  onSendMessage: (content: string, sessionId: string) => void;
  isInBottomPanel?: boolean;
}

const AI_AGENTS = [
  { id: 'maestro', name: 'Maestro', description: 'Task orchestration and coordination' },
  { id: 'ai-integration', name: 'AI Assistant', description: 'Code generation and AI tasks' },
  { id: 'cognitive-refiner', name: 'Optimizer', description: 'Performance optimization' },
  { id: 'coordinator', name: 'Coordinator', description: 'Project planning and decomposition' },
];

export function ChatPanel({ 
  sessions, 
  activeSession, 
  onSessionChange, 
  onSendMessage, 
  isInBottomPanel = false 
}: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('maestro');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentSession = sessions.find(s => s.id === activeSession);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      await onSendMessage(message, activeSession);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      name: `Chat with ${AI_AGENTS.find(a => a.id === selectedAgent)?.name}`,
      agent: selectedAgent,
      messages: []
    };

    // This would normally be handled by the parent component
    console.log('Create new session:', newSession);
  };

  return (
    <div className={`h-full flex flex-col bg-slate-900 ${isInBottomPanel ? '' : 'border-t border-slate-700'}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-200">AI Chat</h3>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-32 h-6 text-xs bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_AGENTS.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {currentSession && (
          <div className="text-xs text-slate-400">
            {currentSession.name} • {currentSession.messages.length} messages
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {currentSession?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className={`text-xs ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-green-600 text-white'
                }`}>
                  {message.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>

              <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-100'
                }`}>
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className={`text-xs text-slate-400 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {formatTimestamp(message.timestamp)}
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-slate-600"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    
                    {message.role === 'assistant' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-slate-600 text-green-400 hover:text-green-300"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-slate-600 text-red-400 hover:text-red-300"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-green-600 text-white text-xs">
                  <Bot className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="inline-block px-3 py-2 rounded-lg text-sm bg-slate-700 text-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-slate-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 bg-slate-800">
        <div className="flex items-center space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI anything about your code..."
            className="flex-1 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
            disabled={isLoading}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-slate-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}