import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { fetchIncidents, fetchClusterStatus, fetchPendingApprovals, approveAction, rejectAction } from '../api/client';
import { Incident, ClusterStatus, ApprovalRequest } from '../types';
import { ApprovalCard } from '../components/approval/ApprovalCard';

export const Dashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cluster, setCluster] = useState<ClusterStatus | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incRes, clusterRes, approvalsRes] = await Promise.all([
        fetchIncidents().catch(() => []),
        fetchClusterStatus().catch(() => ({ connected: false, cluster_name: 'opsara', nodes_count: 0, namespaces: [] })),
        fetchPendingApprovals().catch(() => [])
      ]);
      setIncidents(incRes);
      setCluster(clusterRes);
      setApprovals(approvalsRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    await approveAction(id);
    await loadData();
  };

  const handleReject = async (id: string) => {
    await rejectAction(id);
    await loadData();
  };

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'FAILED'].includes(i.status));
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_FOR_APPROVAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">APPROVAL REQUIRED</span>;
      case 'INVESTIGATING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30">INVESTIGATING</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">RESOLVED</span>;
      case 'ESCALATED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">ESCALATED</span>;
      case 'EXECUTING':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">EXECUTING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-500/20 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>ACTIVE INCIDENTS</span>
            <ShieldAlert className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{activeIncidents.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Requires SRE attention</p>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>PENDING APPROVALS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{approvals.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Safety gated mutations</p>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>RESOLVED INCIDENTS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{resolvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Verified recoveries</p>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>CLUSTER HEALTH</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center space-x-2 font-mono text-sm font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${cluster?.connected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={cluster?.connected ? 'text-emerald-400' : 'text-amber-400'}>
              {cluster?.connected ? 'READY' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{cluster?.cluster_name || 'kind-opsara'}</p>
        </div>
      </div>

      {/* Pending Approvals Section (Top Priority SRE Action) */}
      {approvals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Pending Human Approvals ({approvals.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Operator intervention required to proceed</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {approvals.map((appr) => (
              <ApprovalCard
                key={appr.id}
                approval={appr}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Incidents Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#0E131F]">
          <div>
            <h3 className="font-semibold text-sm text-white">Active Incidents</h3>
            <p className="text-xs text-slate-400">Live Kubernetes workloads undergoing investigation or remediation</p>
          </div>
          <Link
            to="/incidents"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No incidents recorded. Use "New Incident" in the header to launch an investigation.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0E17] text-slate-400 border-b border-[#1E293B] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-6">INCIDENT</th>
                <th className="py-3 px-6">SERVICE</th>
                <th className="py-3 px-6">SEVERITY</th>
                <th className="py-3 px-6">STATUS</th>
                <th className="py-3 px-6">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {incidents.slice(0, 5).map((inc) => (
                <tr key={inc.id} className="hover:bg-[#141B2D] transition">
                  <td className="py-4 px-6">
                    <Link to={`/incidents/${inc.id}`} className="font-semibold text-white hover:text-sky-400 transition">
                      {inc.title}
                    </Link>
                    <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                      {new Date(inc.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-300">
                    {inc.namespace}/{inc.service}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      inc.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {getStatusBadge(inc.status)}
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      to={`/incidents/${inc.id}`}
                      className="px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium transition inline-flex items-center space-x-1"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
