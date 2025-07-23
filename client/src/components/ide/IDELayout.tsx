import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { ChatPanel } from './ChatPanel';
import { Terminal } from './Terminal';
import { AgentDashboard } from './AgentDashboard';
import { Button } from '@/components/ui/button';
import { 
  Code, 
  MessageSquare, 
  Terminal as TerminalIcon, 
  FolderOpen, 
  Settings,
  Bot,
  Play,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

interface ChatSession {
  id: string;
  name: string;
  agent: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export function IDELayout() {
  const [activeFileTab, setActiveFileTab] = useState<string>('');
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSession, setActiveChatSession] = useState<string>('');
  const [sidebarActiveTab, setSidebarActiveTab] = useState('files');
  const [bottomPanelActiveTab, setBottomPanelActiveTab] = useState('terminal');
  const { toast } = useToast();

  // Initialize default chat session
  useEffect(() => {
    const defaultChat: ChatSession = {
      id: 'default-chat',
      name: 'AI Assistant',
      agent: 'maestro',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! I\'m your AI coding assistant. I can help you with code generation, debugging, project planning, and more. What would you like to work on?',
          timestamp: new Date().toISOString()
        }
      ]
    };
    setChatSessions([defaultChat]);
    setActiveChatSession('default-chat');
  }, []);

  const openFile = (file: { name: string; path: string; content: string; language: string }) => {
    const existingTab = fileTabs.find(tab => tab.path === file.path);
    
    if (existingTab) {
      setActiveFileTab(existingTab.id);
      return;
    }

    const newTab: FileTab = {
      id: `file-${Date.now()}`,
      name: file.name,
      path: file.path,
      content: file.content,
      language: file.language,
      isDirty: false
    };

    setFileTabs(prev => [...prev, newTab]);
    setActiveFileTab(newTab.id);
  };

  const closeFile = (tabId: string) => {
    const tab = fileTabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      // In a real implementation, show a save dialog
      if (!confirm(`${tab.name} has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    setFileTabs(prev => prev.filter(t => t.id !== tabId));
    
    if (activeFileTab === tabId) {
      const remainingTabs = fileTabs.filter(t => t.id !== tabId);
      setActiveFileTab(remainingTabs.length > 0 ? remainingTabs[0].id : '');
    }
  };

  const updateFileContent = (tabId: string, content: string) => {
    setFileTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  };

  const saveFile = async (tabId: string) => {
    const tab = fileTabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      // In a real implementation, save to backend/filesystem
      console.log('Saving file:', tab.path, tab.content);
      
      setFileTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, isDirty: false } : t
      ));
      
      toast({
        title: "File saved",
        description: `${tab.name} has been saved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: `Failed to save ${tab.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const runCode = async () => {
    const activeTab = fileTabs.find(t => t.id === activeFileTab);
    if (!activeTab) return;

    try {
      toast({
        title: "Running code",
        description: `Executing ${activeTab.name}...`,
      });

      // In a real implementation, send code to execution service
      console.log('Running code:', activeTab.content);
      
      // Simulate execution
      setTimeout(() => {
        toast({
          title: "Execution complete",
          description: `${activeTab.name} executed successfully.`,
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "An error occurred while running the code.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (content: string, sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: new Date().toISOString()
    };

    setChatSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, messages: [...s.messages, userMessage] }
        : s
    ));

    try {
      // Send to AI integration service
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          agent: session.agent,
          context: {
            activeFile: fileTabs.find(t => t.id === activeFileTab)?.path,
            openFiles: fileTabs.map(t => t.path)
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      
      // Add AI response
      const aiMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant' as const,
        content: data.response || 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date().toISOString()
      };

      setChatSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, aiMessage] }
          : s
      ));
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat error",
        description: "Failed to get response from AI assistant.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold text-blue-400">Synapse IDE</h1>
          <div className="w-px h-6 bg-slate-600"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => saveFile(activeFileTab)}
            disabled={!activeFileTab}
            className="text-slate-300 hover:text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={runCode}
            disabled={!activeFileTab}
            className="text-slate-300 hover:text-white"
          >
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full bg-slate-850">
            <Tabs value={sidebarActiveTab} onValueChange={setSidebarActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                <TabsTrigger value="files" className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="agents" className="flex items-center">
                  <Bot className="h-4 w-4 mr-1" />
                  Agents
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="files" className="h-full mt-0">
                <FileExplorer onFileOpen={openFile} />
              </TabsContent>
              
              <TabsContent value="agents" className="h-full mt-0">
                <AgentDashboard />
              </TabsContent>
              
              <TabsContent value="chat" className="h-full mt-0">
                <ChatPanel
                  sessions={chatSessions}
                  activeSession={activeChatSession}
                  onSessionChange={setActiveChatSession}
                  onSendMessage={sendMessage}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-slate-700 hover:bg-slate-600" />

        {/* Main content area */}
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            {/* Editor area */}
            <ResizablePanel defaultSize={70}>
              <div className="h-full bg-slate-900">
                {fileTabs.length > 0 ? (
                  <Tabs value={activeFileTab} onValueChange={setActiveFileTab} className="h-full">
                    <TabsList className="w-full h-auto p-0 bg-slate-800 rounded-none border-b border-slate-700">
                      {fileTabs.map(tab => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="relative px-4 py-2 rounded-none data-[state=active]:bg-slate-900"
                        >
                          <Code className="h-4 w-4 mr-2" />
                          {tab.name}
                          {tab.isDirty && <span className="text-orange-400 ml-1">●</span>}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-4 w-4 p-0 hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeFile(tab.id);
                            }}
                          >
                            ×
                          </Button>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {fileTabs.map(tab => (
                      <TabsContent key={tab.id} value={tab.id} className="h-full mt-0">
                        <CodeEditor
                          value={tab.content}
                          language={tab.language}
                          onChange={(value) => updateFileContent(tab.id, value || '')}
                          path={tab.path}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No files open</p>
                      <p className="text-sm">Open a file from the explorer or create a new one</p>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle className="h-1 bg-slate-700 hover:bg-slate-600" />

            {/* Bottom panel */}
            <ResizablePanel defaultSize={30} minSize={15}>
              <div className="h-full bg-slate-850">
                <Tabs value={bottomPanelActiveTab} onValueChange={setBottomPanelActiveTab} className="h-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                    <TabsTrigger value="terminal" className="flex items-center">
                      <TerminalIcon className="h-4 w-4 mr-1" />
                      Terminal
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      AI Chat
                    </TabsTrigger>
                    <TabsTrigger value="output" className="flex items-center">
                      <Code className="h-4 w-4 mr-1" />
                      Output
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="terminal" className="h-full mt-0">
                    <Terminal />
                  </TabsContent>
                  
                  <TabsContent value="chat" className="h-full mt-0">
                    <ChatPanel
                      sessions={chatSessions}
                      activeSession={activeChatSession}
                      onSessionChange={setActiveChatSession}
                      onSendMessage={sendMessage}
                      isInBottomPanel={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="output" className="h-full mt-0">
                    <div className="h-full p-4 font-mono text-sm text-slate-300 bg-slate-900">
                      <div className="mb-2 text-slate-400">Output Console</div>
                      <div className="space-y-1">
                        <div className="text-green-400">[INFO] System initialized successfully</div>
                        <div className="text-blue-400">[DEBUG] AI services connected</div>
                        <div className="text-yellow-400">[WARN] Some agents offline</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}