import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, RotateCcw } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: string;
}

export function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeLines: TerminalLine[] = [
      {
        id: '1',
        type: 'output',
        content: 'Synapse AI Terminal - Ready',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        type: 'output',
        content: 'Type "help" for available commands',
        timestamp: new Date().toISOString()
      }
    ];
    setLines(welcomeLines);
  }, []);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [lines]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date().toISOString()
    };
    setLines(prev => [...prev, newLine]);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to lines
    addLine('command', `$ ${command}`);
    
    // Add to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    
    setIsExecuting(true);

    try {
      // Simulate command execution
      await simulateCommand(command.trim());
    } catch (error) {
      addLine('error', `Error: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const simulateCommand = async (command: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const [cmd, ...args] = command.split(' ');
        
        switch (cmd.toLowerCase()) {
          case 'help':
            addLine('output', 'Available commands:');
            addLine('output', '  help                 - Show this help message');
            addLine('output', '  clear                - Clear terminal');
            addLine('output', '  ls                   - List files');
            addLine('output', '  pwd                  - Print working directory');
            addLine('output', '  npm run dev          - Start development server');
            addLine('output', '  npm test             - Run tests');
            addLine('output', '  git status           - Check git status');
            addLine('output', '  agents               - List active agents');
            addLine('output', '  system status        - Show system metrics');
            break;
            
          case 'clear':
            setLines([]);
            break;
            
          case 'ls':
            addLine('output', 'client/');
            addLine('output', 'server/');
            addLine('output', 'shared/');
            addLine('output', 'package.json');
            addLine('output', 'README.md');
            addLine('output', 'tsconfig.json');
            break;
            
          case 'pwd':
            addLine('output', '/workspace/synapse-ai');
            break;
            
          case 'npm':
            if (args[0] === 'run' && args[1] === 'dev') {
              addLine('output', '> synapse-ai@1.0.0 dev');
              addLine('output', '> NODE_ENV=development tsx server/index.ts');
              addLine('output', '');
              addLine('output', 'Server starting...');
              addLine('output', '✓ Database connected');
              addLine('output', '✓ AI services initialized');
              addLine('output', '✓ WebSocket server ready');
              addLine('output', '🚀 Server running on http://localhost:5000');
            } else if (args[0] === 'test') {
              addLine('output', '> synapse-ai@1.0.0 test');
              addLine('output', '> jest');
              addLine('output', '');
              addLine('output', 'PASS  src/components/ide/CodeEditor.test.tsx');
              addLine('output', 'PASS  src/services/aiIntegration.test.ts');
              addLine('output', 'PASS  src/services/agentOrchestrator.test.ts');
              addLine('output', '');
              addLine('output', 'Test Suites: 3 passed, 3 total');
              addLine('output', 'Tests:       15 passed, 15 total');
              addLine('output', 'Snapshots:   0 total');
              addLine('output', 'Time:        2.847 s');
            } else {
              addLine('error', `Unknown npm command: ${args.join(' ')}`);
            }
            break;
            
          case 'git':
            if (args[0] === 'status') {
              addLine('output', 'On branch main');
              addLine('output', 'Your branch is up to date with \'origin/main\'.');
              addLine('output', '');
              addLine('output', 'Changes not staged for commit:');
              addLine('output', '  (use "git add <file>..." to update what will be committed)');
              addLine('output', '  (use "git checkout -- <file>..." to discard changes in working directory)');
              addLine('output', '');
              addLine('output', '        modified:   client/src/components/ide/IDELayout.tsx');
              addLine('output', '        modified:   server/routes.ts');
              addLine('output', '');
              addLine('output', 'no changes added to commit (use "git add" or "git commit -a")');
            } else {
              addLine('error', `Unknown git command: ${args.join(' ')}`);
            }
            break;
            
          case 'agents':
            addLine('output', 'Active Agents:');
            addLine('output', '  📋 Maestro Agent        - Status: Online  - Health: 95%');
            addLine('output', '  🤖 AI Integration      - Status: Online  - Health: 92%');
            addLine('output', '  🐳 MCP Manager         - Status: Online  - Health: 88%');
            addLine('output', '  📊 Project Agent       - Status: Online  - Health: 90%');
            addLine('output', '  🧠 Cognitive Refiner   - Status: Online  - Health: 94%');
            break;
            
          case 'system':
            if (args[0] === 'status') {
              addLine('output', 'System Status:');
              addLine('output', '  CPU Usage:      35%');
              addLine('output', '  Memory Usage:   68%');
              addLine('output', '  Disk Usage:     42%');
              addLine('output', '  Active Tasks:   3');
              addLine('output', '  Queue Size:     7');
              addLine('output', '  Uptime:         2h 15m');
              addLine('output', '  Status:         🟢 Healthy');
            } else {
              addLine('error', `Unknown system command: ${args.join(' ')}`);
            }
            break;
            
          default:
            addLine('error', `Command not found: ${cmd}`);
            addLine('output', 'Type "help" for available commands');
        }
        
        resolve();
      }, 500 + Math.random() * 1000); // Simulate execution delay
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentCommand);
      setCurrentCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistory.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Basic tab completion
      const commands = ['help', 'clear', 'ls', 'pwd', 'npm', 'git', 'agents', 'system'];
      const matches = commands.filter(cmd => cmd.startsWith(currentCommand));
      if (matches.length === 1) {
        setCurrentCommand(matches[0]);
      }
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-400 font-mono">
      {/* Terminal header */}
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm text-slate-300">Terminal</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal content */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
        <div className="space-y-1">
          {lines.map((line) => (
            <div key={line.id} className="flex items-start space-x-2 text-sm">
              <span className="text-xs text-slate-500 w-12 flex-shrink-0">
                {formatTimestamp(line.timestamp)}
              </span>
              <div className={`flex-1 ${
                line.type === 'command' 
                  ? 'text-white font-semibold' 
                  : line.type === 'error'
                  ? 'text-red-400'
                  : 'text-green-400'
              }`}>
                {line.content}
              </div>
            </div>
          ))}
          
          {isExecuting && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-xs text-slate-500 w-12">
                {formatTimestamp(new Date().toISOString())}
              </span>
              <div className="flex items-center space-x-2 text-yellow-400">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Executing...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Command input */}
      <div className="p-3 border-t border-slate-700 bg-slate-900">
        <div className="flex items-center space-x-2">
          <span className="text-green-400 text-sm font-semibold">$</span>
          <Input
            ref={inputRef}
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 bg-transparent border-none text-green-400 placeholder-slate-500 focus:ring-0 font-mono"
            disabled={isExecuting}
            autoFocus
          />
        </div>
        
        <div className="mt-1 text-xs text-slate-500">
          Use ↑/↓ for history, Tab for completion
        </div>
      </div>
    </div>
  );
}