import { Incident, ApprovalRequest, ClusterStatus, PodInfo, DeploymentInfo, Runbook, AuditLog } from '../types';

const API_BASE = '/api';

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchIncidentById(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch incident ${id}`);
  return res.json();
}

export async function createIncident(data: {
  title: string;
  service: string;
  namespace: string;
  severity: string;
  runbook_id?: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create incident');
  return res.json();
}

export async function startInvestigation(incidentId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/start`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to start investigation');
  return res.json();
}

export async function fetchPendingApprovals(): Promise<ApprovalRequest[]> {
  const res = await fetch(`${API_BASE}/approvals`);
  if (!res.ok) throw new Error('Failed to fetch approvals');
  return res.json();
}

export async function approveAction(approvalId: string, operator: string = 'SRE Operator'): Promise<any> {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operator })
  });
  if (!res.ok) throw new Error('Failed to approve action');
  return res.json();
}

export async function rejectAction(approvalId: string, operator: string = 'SRE Operator'): Promise<any> {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operator })
  });
  if (!res.ok) throw new Error('Failed to reject action');
  return res.json();
}

export async function fetchClusterStatus(): Promise<ClusterStatus> {
  const res = await fetch(`${API_BASE}/cluster/status`);
  if (!res.ok) throw new Error('Failed to fetch cluster status');
  return res.json();
}

export async function fetchClusterPods(namespace: string = 'opsara-demo'): Promise<PodInfo[]> {
  const res = await fetch(`${API_BASE}/cluster/pods?namespace=${namespace}`);
  if (!res.ok) throw new Error('Failed to fetch pods');
  return res.json();
}

export async function fetchClusterDeployments(namespace: string = 'opsara-demo'): Promise<DeploymentInfo[]> {
  const res = await fetch(`${API_BASE}/cluster/deployments?namespace=${namespace}`);
  if (!res.ok) throw new Error('Failed to fetch deployments');
  return res.json();
}

export async function fetchPodLogs(podName: string, namespace: string = 'opsara-demo'): Promise<{ logs: string; total_lines: number }> {
  const res = await fetch(`${API_BASE}/cluster/pods/${podName}/logs?namespace=${namespace}`);
  if (!res.ok) throw new Error('Failed to fetch pod logs');
  return res.json();
}

export async function fetchRunbooks(): Promise<Runbook[]> {
  const res = await fetch(`${API_BASE}/runbooks`);
  if (!res.ok) throw new Error('Failed to fetch runbooks');
  return res.json();
}

export async function fetchAuditLogs(incidentId?: string): Promise<AuditLog[]> {
  const url = incidentId ? `${API_BASE}/audit?incident_id=${incidentId}` : `${API_BASE}/audit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function triggerScenario(type: 'oom' | 'db-failure' | 'rollout-failure' | 'reset'): Promise<any> {
  const endpointMap = {
    'oom': '/scenarios/trigger-oom',
    'db-failure': '/scenarios/trigger-db-failure',
    'rollout-failure': '/scenarios/trigger-rollout-failure',
    'reset': '/scenarios/reset'
  };
  const res = await fetch(`${API_BASE}${endpointMap[type]}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to trigger scenario ${type}`);
  return res.json();
}
