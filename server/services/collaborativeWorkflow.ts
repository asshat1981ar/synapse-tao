import { nanoid } from 'nanoid';
import { WebSocketManager } from './websocketManager';

interface WorkflowUser {
  id: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  isOnline: boolean;
  lastActive: string;
  currentCursor?: {
    line: number;
    column: number;
    selection?: { start: number; end: number };
  };
}

interface WorkflowNode {
  id: string;
  type: 'agent' | 'task' | 'condition' | 'parallel' | 'sequential';
  name: string;
  description: string;
  position: { x: number; y: number };
  properties: Record<string, any>;
  connections: {
    inputs: string[];
    outputs: string[];
  };
  metadata: {
    createdBy: string;
    createdAt: string;
    lastModifiedBy: string;
    lastModifiedAt: string;
    version: number;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'default' | 'conditional' | 'data';
  properties: Record<string, any>;
  metadata: {
    createdBy: string;
    createdAt: string;
    version: number;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: number;
  status: 'draft' | 'active' | 'paused' | 'archived';
  metadata: {
    createdBy: string;
    createdAt: string;
    lastModifiedBy: string;
    lastModifiedAt: string;
    collaborators: WorkflowUser[];
  };
  permissions: {
    canEdit: string[];
    canView: string[];
    canExecute: string[];
  };
}

interface WorkflowOperation {
  id: string;
  type: 'add_node' | 'update_node' | 'delete_node' | 'add_edge' | 'update_edge' | 'delete_edge' | 'move_node';
  workflowId: string;
  userId: string;
  timestamp: string;
  data: any;
  reverted?: boolean;
}

interface ConflictResolution {
  conflictId: string;
  operations: WorkflowOperation[];
  resolution: 'merge' | 'override' | 'manual';
  resolvedBy?: string;
  resolvedAt?: string;
  metadata: {
    conflictType: 'concurrent_edit' | 'version_mismatch' | 'permission_conflict';
    affectedElements: string[];
    severity: 'low' | 'medium' | 'high';
  };
}

interface CollaborationSession {
  id: string;
  workflowId: string;
  participants: WorkflowUser[];
  startTime: string;
  endTime?: string;
  operations: WorkflowOperation[];
  conflicts: ConflictResolution[];
  status: 'active' | 'completed';
}

export class CollaborativeWorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private operationHistory: Map<string, WorkflowOperation[]> = new Map();
  private conflictQueue: ConflictResolution[] = [];
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.initializeDefaultWorkflows();
  }

  /**
   * Initialize default workflow templates
   */
  private initializeDefaultWorkflows() {
    const defaultWorkflow: Workflow = {
      id: 'default-workflow',
      name: 'AI Agent Orchestration Template',
      description: 'Template for multi-agent AI workflow orchestration',
      version: 1,
      status: 'draft',
      nodes: [
        {
          id: 'start-node',
          type: 'task',
          name: 'Start',
          description: 'Workflow entry point',
          position: { x: 100, y: 100 },
          properties: { autoStart: true },
          connections: { inputs: [], outputs: ['maestro-node'] },
          metadata: {
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            lastModifiedBy: 'system',
            lastModifiedAt: new Date().toISOString(),
            version: 1
          }
        },
        {
          id: 'maestro-node',
          type: 'agent',
          name: 'Maestro Agent',
          description: 'Orchestrates overall workflow execution',
          position: { x: 300, y: 100 },
          properties: { 
            agentType: 'maestro',
            timeout: 300,
            retryCount: 3
          },
          connections: { inputs: ['start-node'], outputs: ['coordination-node'] },
          metadata: {
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            lastModifiedBy: 'system',
            lastModifiedAt: new Date().toISOString(),
            version: 1
          }
        }
      ],
      edges: [
        {
          id: 'edge-start-maestro',
          source: 'start-node',
          target: 'maestro-node',
          type: 'default',
          properties: {},
          metadata: {
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            version: 1
          }
        }
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        lastModifiedBy: 'system',
        lastModifiedAt: new Date().toISOString(),
        collaborators: []
      },
      permissions: {
        canEdit: ['admin'],
        canView: ['admin', 'editor', 'viewer'],
        canExecute: ['admin', 'editor']
      }
    };

    this.workflows.set(defaultWorkflow.id, defaultWorkflow);
  }

  /**
   * Create new collaborative workflow session
   */
  async createCollaborationSession(workflowId: string, userId: string): Promise<CollaborationSession> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const sessionId = nanoid();
    const session: CollaborationSession = {
      id: sessionId,
      workflowId,
      participants: [],
      startTime: new Date().toISOString(),
      operations: [],
      conflicts: [],
      status: 'active'
    };

    this.activeSessions.set(sessionId, session);
    
    // Join user to session
    await this.joinSession(sessionId, userId);

    console.log(`[CollaborativeWorkflow] Created session ${sessionId} for workflow ${workflowId}`);
    return session;
  }

  /**
   * Join user to collaboration session
   */
  async joinSession(sessionId: string, userId: string, userInfo?: Partial<WorkflowUser>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const user: WorkflowUser = {
      id: userId,
      name: userInfo?.name || `User ${userId}`,
      role: userInfo?.role || 'editor',
      avatar: userInfo?.avatar,
      isOnline: true,
      lastActive: new Date().toISOString()
    };

    // Check if user already in session
    const existingUserIndex = session.participants.findIndex(p => p.id === userId);
    if (existingUserIndex >= 0) {
      session.participants[existingUserIndex] = user;
    } else {
      session.participants.push(user);
    }

    // Broadcast user join event
    this.wsManager.broadcast('workflow_collaboration', {
      type: 'user_joined',
      sessionId,
      user,
      participants: session.participants
    }, 'workflow_update');

    console.log(`[CollaborativeWorkflow] User ${userId} joined session ${sessionId}`);
  }

  /**
   * Leave collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Remove user from participants
    session.participants = session.participants.filter(p => p.id !== userId);

    // Broadcast user leave event
    this.wsManager.broadcast('workflow_collaboration', {
      type: 'user_left',
      sessionId,
      userId,
      participants: session.participants
    }, 'workflow_update');

    // End session if no participants
    if (session.participants.length === 0) {
      session.status = 'completed';
      session.endTime = new Date().toISOString();
      this.activeSessions.delete(sessionId);
    }

    console.log(`[CollaborativeWorkflow] User ${userId} left session ${sessionId}`);
  }

  /**
   * Apply workflow operation with conflict detection
   */
  async applyOperation(operation: WorkflowOperation): Promise<{ success: boolean; conflict?: ConflictResolution }> {
    const workflow = this.workflows.get(operation.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${operation.workflowId} not found`);
    }

    // Check for conflicts
    const conflict = await this.detectConflicts(operation);
    if (conflict) {
      return { success: false, conflict };
    }

    // Apply operation
    const success = this.executeOperation(workflow, operation);
    if (success) {
      // Update workflow version
      workflow.version++;
      workflow.metadata.lastModifiedBy = operation.userId;
      workflow.metadata.lastModifiedAt = operation.timestamp;

      // Store operation in history
      const history = this.operationHistory.get(operation.workflowId) || [];
      history.push(operation);
      this.operationHistory.set(operation.workflowId, history);

      // Broadcast operation to all session participants
      const sessions = Array.from(this.activeSessions.values())
        .filter(s => s.workflowId === operation.workflowId);
      
      sessions.forEach(session => {
        this.wsManager.broadcast('workflow_collaboration', {
          type: 'operation_applied',
          sessionId: session.id,
          operation,
          workflow: this.sanitizeWorkflowForClient(workflow)
        }, 'workflow_update');
      });
    }

    return { success };
  }

  /**
   * Detect conflicts between operations
   */
  private async detectConflicts(operation: WorkflowOperation): Promise<ConflictResolution | null> {
    const recentOps = this.getRecentOperations(operation.workflowId, 5000); // Last 5 seconds
    
    for (const recentOp of recentOps) {
      if (recentOp.userId === operation.userId) continue; // Same user
      
      const conflictType = this.analyzeConflictType(operation, recentOp);
      if (conflictType) {
        const conflict: ConflictResolution = {
          conflictId: nanoid(),
          operations: [recentOp, operation],
          resolution: 'manual', // Default to manual resolution
          metadata: {
            conflictType,
            affectedElements: this.getAffectedElements(operation, recentOp),
            severity: this.calculateConflictSeverity(operation, recentOp)
          }
        };

        this.conflictQueue.push(conflict);
        
        // Attempt automatic resolution
        const autoResolved = await this.attemptAutoResolution(conflict);
        if (autoResolved) {
          conflict.resolution = 'merge';
          conflict.resolvedBy = 'system';
          conflict.resolvedAt = new Date().toISOString();
        }

        return conflict;
      }
    }

    return null;
  }

  /**
   * Analyze conflict type between two operations
   */
  private analyzeConflictType(op1: WorkflowOperation, op2: WorkflowOperation): string | null {
    // Same element being modified
    if (this.operationsAffectSameElement(op1, op2)) {
      return 'concurrent_edit';
    }

    // Version mismatch
    if (op1.type === 'update_node' && op2.type === 'delete_node' && 
        op1.data.nodeId === op2.data.nodeId) {
      return 'version_mismatch';
    }

    // Connected elements
    if (this.operationsAffectConnectedElements(op1, op2)) {
      return 'concurrent_edit';
    }

    return null;
  }

  /**
   * Check if operations affect the same element
   */
  private operationsAffectSameElement(op1: WorkflowOperation, op2: WorkflowOperation): boolean {
    if (op1.type.includes('node') && op2.type.includes('node')) {
      return op1.data.nodeId === op2.data.nodeId;
    }
    
    if (op1.type.includes('edge') && op2.type.includes('edge')) {
      return op1.data.edgeId === op2.data.edgeId;
    }

    return false;
  }

  /**
   * Check if operations affect connected elements
   */
  private operationsAffectConnectedElements(op1: WorkflowOperation, op2: WorkflowOperation): boolean {
    // If one operation deletes a node and another modifies its connections
    if (op1.type === 'delete_node' && op2.type === 'add_edge') {
      return op2.data.source === op1.data.nodeId || op2.data.target === op1.data.nodeId;
    }

    return false;
  }

  /**
   * Get elements affected by operations
   */
  private getAffectedElements(op1: WorkflowOperation, op2: WorkflowOperation): string[] {
    const elements = new Set<string>();
    
    [op1, op2].forEach(op => {
      if (op.data.nodeId) elements.add(op.data.nodeId);
      if (op.data.edgeId) elements.add(op.data.edgeId);
      if (op.data.source) elements.add(op.data.source);
      if (op.data.target) elements.add(op.data.target);
    });

    return Array.from(elements);
  }

  /**
   * Calculate conflict severity
   */
  private calculateConflictSeverity(op1: WorkflowOperation, op2: WorkflowOperation): 'low' | 'medium' | 'high' {
    // Delete operations are high severity
    if (op1.type.includes('delete') || op2.type.includes('delete')) {
      return 'high';
    }

    // Structural changes are medium severity
    if (op1.type === 'add_edge' || op2.type === 'add_edge') {
      return 'medium';
    }

    // Property updates are low severity
    return 'low';
  }

  /**
   * Attempt automatic conflict resolution
   */
  private async attemptAutoResolution(conflict: ConflictResolution): Promise<boolean> {
    if (conflict.metadata.severity === 'low') {
      // For low severity conflicts, merge changes automatically
      const mergedOperation = this.mergeOperations(conflict.operations);
      if (mergedOperation) {
        // Apply merged operation
        const workflow = this.workflows.get(conflict.operations[0].workflowId);
        if (workflow) {
          this.executeOperation(workflow, mergedOperation);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Merge compatible operations
   */
  private mergeOperations(operations: WorkflowOperation[]): WorkflowOperation | null {
    if (operations.length !== 2) return null;

    const [op1, op2] = operations;
    
    // Merge property updates for the same node
    if (op1.type === 'update_node' && op2.type === 'update_node' && 
        op1.data.nodeId === op2.data.nodeId) {
      
      return {
        id: nanoid(),
        type: 'update_node',
        workflowId: op1.workflowId,
        userId: 'system',
        timestamp: new Date().toISOString(),
        data: {
          nodeId: op1.data.nodeId,
          updates: { ...op1.data.updates, ...op2.data.updates }
        }
      };
    }

    return null;
  }

  /**
   * Execute workflow operation
   */
  private executeOperation(workflow: Workflow, operation: WorkflowOperation): boolean {
    try {
      switch (operation.type) {
        case 'add_node':
          workflow.nodes.push(operation.data.node);
          break;
          
        case 'update_node':
          const nodeIndex = workflow.nodes.findIndex(n => n.id === operation.data.nodeId);
          if (nodeIndex >= 0) {
            workflow.nodes[nodeIndex] = { ...workflow.nodes[nodeIndex], ...operation.data.updates };
            workflow.nodes[nodeIndex].metadata.lastModifiedBy = operation.userId;
            workflow.nodes[nodeIndex].metadata.lastModifiedAt = operation.timestamp;
            workflow.nodes[nodeIndex].metadata.version++;
          }
          break;
          
        case 'delete_node':
          workflow.nodes = workflow.nodes.filter(n => n.id !== operation.data.nodeId);
          // Also remove connected edges
          workflow.edges = workflow.edges.filter(e => 
            e.source !== operation.data.nodeId && e.target !== operation.data.nodeId
          );
          break;
          
        case 'add_edge':
          workflow.edges.push(operation.data.edge);
          break;
          
        case 'update_edge':
          const edgeIndex = workflow.edges.findIndex(e => e.id === operation.data.edgeId);
          if (edgeIndex >= 0) {
            workflow.edges[edgeIndex] = { ...workflow.edges[edgeIndex], ...operation.data.updates };
          }
          break;
          
        case 'delete_edge':
          workflow.edges = workflow.edges.filter(e => e.id !== operation.data.edgeId);
          break;
          
        case 'move_node':
          const moveNodeIndex = workflow.nodes.findIndex(n => n.id === operation.data.nodeId);
          if (moveNodeIndex >= 0) {
            workflow.nodes[moveNodeIndex].position = operation.data.position;
            workflow.nodes[moveNodeIndex].metadata.lastModifiedBy = operation.userId;
            workflow.nodes[moveNodeIndex].metadata.lastModifiedAt = operation.timestamp;
          }
          break;
          
        default:
          return false;
      }
      
      return true;
    } catch (error) {
      console.error('[CollaborativeWorkflow] Error executing operation:', error);
      return false;
    }
  }

  /**
   * Get recent operations for conflict detection
   */
  private getRecentOperations(workflowId: string, timeWindow: number): WorkflowOperation[] {
    const history = this.operationHistory.get(workflowId) || [];
    const cutoff = new Date(Date.now() - timeWindow).toISOString();
    
    return history.filter(op => op.timestamp > cutoff && !op.reverted);
  }

  /**
   * Update user cursor position
   */
  async updateUserCursor(sessionId: string, userId: string, cursor: WorkflowUser['currentCursor']): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const user = session.participants.find(p => p.id === userId);
    if (user) {
      user.currentCursor = cursor;
      user.lastActive = new Date().toISOString();

      // Broadcast cursor update
      this.wsManager.broadcast('workflow_collaboration', {
        type: 'cursor_update',
        sessionId,
        userId,
        cursor
      }, 'workflow_update');
    }
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(conflictId: string, resolution: 'accept_all' | 'accept_first' | 'accept_last' | 'custom', customResolution?: any): Promise<void> {
    const conflictIndex = this.conflictQueue.findIndex(c => c.conflictId === conflictId);
    if (conflictIndex === -1) return;

    const conflict = this.conflictQueue[conflictIndex];
    const workflow = this.workflows.get(conflict.operations[0].workflowId);
    if (!workflow) return;

    switch (resolution) {
      case 'accept_first':
        this.executeOperation(workflow, conflict.operations[0]);
        break;
      case 'accept_last':
        this.executeOperation(workflow, conflict.operations[1]);
        break;
      case 'accept_all':
        conflict.operations.forEach(op => this.executeOperation(workflow, op));
        break;
      case 'custom':
        if (customResolution) {
          this.executeOperation(workflow, customResolution);
        }
        break;
    }

    conflict.resolution = resolution === 'custom' ? 'manual' : 'override';
    conflict.resolvedBy = 'user';
    conflict.resolvedAt = new Date().toISOString();

    // Remove from queue
    this.conflictQueue.splice(conflictIndex, 1);

    console.log(`[CollaborativeWorkflow] Resolved conflict ${conflictId} with resolution: ${resolution}`);
  }

  /**
   * Get workflow with sanitized data for client
   */
  private sanitizeWorkflowForClient(workflow: Workflow): any {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      edges: workflow.edges,
      version: workflow.version,
      status: workflow.status
    };
  }

  /**
   * Get collaboration statistics
   */
  getCollaborationStats() {
    const activeSessions = Array.from(this.activeSessions.values());
    const totalOperations = Array.from(this.operationHistory.values())
      .reduce((sum, ops) => sum + ops.length, 0);

    return {
      activeWorkflows: this.workflows.size,
      activeSessions: activeSessions.length,
      totalParticipants: activeSessions.reduce((sum, s) => sum + s.participants.length, 0),
      totalOperations,
      pendingConflicts: this.conflictQueue.length,
      averageSessionDuration: this.calculateAverageSessionDuration()
    };
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(): number {
    const completedSessions = Array.from(this.activeSessions.values())
      .filter(s => s.status === 'completed' && s.endTime);
    
    if (completedSessions.length === 0) return 0;

    const totalDuration = completedSessions.reduce((sum, session) => {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime!).getTime();
      return sum + (end - start);
    }, 0);

    return totalDuration / completedSessions.length / 1000; // Convert to seconds
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get active sessions for workflow
   */
  getActiveSessionsForWorkflow(workflowId: string): CollaborationSession[] {
    return Array.from(this.activeSessions.values())
      .filter(s => s.workflowId === workflowId);
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ConflictResolution[] {
    return this.conflictQueue.filter(c => !c.resolvedAt);
  }
}

export const collaborativeWorkflowService = (wsManager: WebSocketManager) => 
  new CollaborativeWorkflowService(wsManager);