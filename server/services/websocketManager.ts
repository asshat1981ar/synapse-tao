import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from '../storage';

interface WebSocketClient {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
}

interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private channels: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.startMetricsInterval();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: WebSocket) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        socket,
        subscriptions: new Set()
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      socket.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      socket.on('close', () => {
        this.handleDisconnect(clientId);
      });

      socket.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnect(clientId);
      });

      // Send initial connection confirmation
      this.sendToClient(clientId, {
        type: 'connection',
        channel: 'system',
        data: { clientId, status: 'connected' }
      });
    });
  }

  private handleMessage(clientId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.subscribe(clientId, message.channel);
        break;
      case 'unsubscribe':
        this.unsubscribe(clientId, message.channel);
        break;
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          channel: 'system',
          data: { timestamp: Date.now() }
        });
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private subscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(clientId);

    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      data: { status: 'success' }
    });

    console.log(`Client ${clientId} subscribed to channel: ${channel}`);
  }

  private unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);
    this.channels.get(channel)?.delete(clientId);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      data: { status: 'success' }
    });

    console.log(`Client ${clientId} unsubscribed from channel: ${channel}`);
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    client.subscriptions.forEach(channel => {
      this.channels.get(channel)?.delete(clientId);
    });

    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) return;

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
    }
  }

  public broadcast(channel: string, data: any, messageType: string = 'update'): void {
    const subscribedClients = this.channels.get(channel);
    if (!subscribedClients) return;

    const message: WebSocketMessage = {
      type: messageType,
      channel,
      data
    };

    subscribedClients.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startMetricsInterval(): void {
    // Broadcast system metrics every 10 seconds
    setInterval(async () => {
      try {
        const metrics = await storage.getLatestSystemMetrics();
        if (metrics) {
          this.broadcast('metrics', metrics, 'metrics_update');
        }
      } catch (error) {
        console.error('Failed to broadcast metrics:', error);
      }
    }, 10000);

    // Broadcast agent status every 15 seconds
    setInterval(async () => {
      try {
        const agents = await storage.getAllAgents();
        this.broadcast('agents', agents, 'agents_update');
      } catch (error) {
        console.error('Failed to broadcast agent status:', error);
      }
    }, 15000);

    // Broadcast task updates every 5 seconds
    setInterval(async () => {
      try {
        const tasks = await storage.getAllTasks();
        this.broadcast('tasks', tasks.slice(0, 20), 'tasks_update'); // Limit to recent 20 tasks
      } catch (error) {
        console.error('Failed to broadcast task updates:', error);
      }
    }, 5000);

    // Broadcast system logs every 30 seconds
    setInterval(async () => {
      try {
        const logs = await storage.getSystemLogs(50); // Get latest 50 logs
        this.broadcast('logs', logs, 'logs_update');
      } catch (error) {
        console.error('Failed to broadcast logs:', error);
      }
    }, 30000);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getChannelSubscriptions(): Record<string, number> {
    const subscriptions: Record<string, number> = {};
    this.channels.forEach((clients, channel) => {
      subscriptions[channel] = clients.size;
    });
    return subscriptions;
  }
}
