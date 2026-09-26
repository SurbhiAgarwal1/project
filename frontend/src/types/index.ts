export type IncidentStatus = 
  | 'OPEN'
  | 'INVESTIGATING'
  | 'WAITING_FOR_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'FAILED';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EvidenceType = 'OBSERVED' | 'INFERRED' | 'PROPOSED' | 'EXECUTED' | 'VERIFIED';
export type RiskLevel = 'READ_ONLY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IncidentEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  metadata?: any;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  source_tool: string;
  summary: string;
  observed_at: string;
  payload: any;
}

export interface ApprovalRequest {
  id: string;
  incident_id: string;
  action_type: string;
  target: string;
  namespace: string;
  reason: string;
  risk_level: RiskLevel;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  expected_impact?: string;
  rollback_available: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface VerificationResult {
  id: string;
  status: 'PASSED' | 'FAILED';
  summary: string;
  checks: {
    items: Array<{
      name: string;
      passed: boolean;
      detail: string;
    }>;
  };
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  namespace: string;
  status: IncidentStatus;
  severity: Severity;
  runbook_id?: string;
  summary?: string;
  hypothesis?: {
    likely_cause: string;
    confidence: number;
    summary: string;
    supporting_evidence: string[];
    contradicting_evidence: string[];
  };
  created_at: string;
  updated_at?: string;
  events?: IncidentEvent[];
  evidence?: Evidence[];
  approvals?: ApprovalRequest[];
  verifications?: VerificationResult[];
}

export interface PodInfo {
  name: string;
  namespace: string;
  phase: string;
  ready: boolean;
  restart_count: number;
  node_name?: string;
  pod_ip?: string;
  created_at?: string;
  containers: Array<{
    name: string;
    image: string;
    ready: boolean;
    restart_count: number;
    state: string;
    reason?: string;
    exit_code?: number;
    memory_limit?: string;
    cpu_limit?: string;
  }>;
  termination_reason?: string;
}

export interface DeploymentInfo {
  name: string;
  namespace: string;
  desired_replicas: number;
  ready_replicas: number;
  available_replicas: number;
  updated_replicas: number;
  images: string[];
  conditions: Record<string, string>;
}

export interface ClusterStatus {
  connected: boolean;
  cluster_name: string;
  server_version?: string;
  nodes_count: number;
  namespaces: string[];
  error?: string;
}

export interface RunbookStep {
  id: string;
  action: string;
  risk: string;
  requires_approval: boolean;
  description?: string;
}

export interface Runbook {
  id: string;
  name: string;
  service: string;
  description: string;
  namespace: string;
  step_count: number;
  steps: RunbookStep[];
}

export interface AuditLog {
  id: string;
  incident_id: string;
  timestamp: string;
  actor: string;
  action: string;
  target?: string;
  risk?: string;
  result?: any;
}
