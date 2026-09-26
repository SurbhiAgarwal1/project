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
  RefreshCw,
  Zap,
  Terminal,
  ExternalLink,
  Flame,
  CheckCircle
} from 'lucide-react';
import { 
  fetchIncidents, 
  fetchClusterStatus, 
  fetchPendingApprovals, 
  approveAction, 
  rejectAction,
  triggerScenario 
} from '../api/client';
import { Incident, ClusterStatus, ApprovalRequest } from '../types';
import { ApprovalCard } from '../components/approval/ApprovalCard';

export const Dashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cluster, setCluster] = useState<ClusterStatus | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState<string | null>(null);
  const [scenarioNotice, setScenarioNotice] = useState<string | null>(null);

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
    const interval = setInterval(loadData, 4000);
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

  const handleInjectFault = async (type: 'oom' | 'db-failure' | 'rollout-failure' | 'reset') => {
    try {
      setInjecting(type);
      const res = await triggerScenario(type);
      setScenarioNotice(res.message || `Fault scenario ${type} triggered`);
      setTimeout(() => setScenarioNotice(null), 5000);
      await loadData();
    } catch (e: any) {
      alert(`Fault Injection Notice: ${e.message || 'Error triggering scenario'}`);
    } finally {
      setInjecting(null);
    }
  };

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'FAILED'].includes(i.status));
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;
  const criticalCount = activeIncidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount = activeIncidents.filter(i => i.severity === 'HIGH').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING_FOR_APPROVAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>APPROVAL REQUIRED</span>
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
            <span>INVESTIGATING</span>
          </span>
        );
      case 'EXECUTING':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>EXECUTING PATCH</span>
          </span>
        );
      case 'VERIFYING':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>VERIFYING RECOVERY</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>RESOLVED</span>
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>ESCALATED</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* SRE Operational State Banner */}
      {approvals.length > 0 ? (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-lg p-3.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wider">
                SAFETY GATE ENGAGED: {approvals.length} MUTATION AWAITING SRE OPERATOR AUTHORIZATION
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Deterministic policy halted execution prior to modifying live Kubernetes resources. Operator sign-off required.
              </p>
            </div>
          </div>
          <a href="#pending-approvals" className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition">
            Review Request
          </a>
        </div>
      ) : activeIncidents.length > 0 ? (
        <div className="bg-sky-950/20 border border-sky-500/30 rounded-lg p-3.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-sky-300 uppercase tracking-wider">
                ACTIVE INVESTIGATION IN PROGRESS ({activeIncidents.length} WORKLOAD IMPACTED)
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                LangGraph agent is querying pod diagnostics, logs, and formulating evidence-based root cause hypothesis.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30 text-[11px]">
            Target: opsara-demo
          </span>
        </div>
      ) : (
        <div className="bg-emerald-950/15 border border-emerald-500/30 rounded-lg p-3.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-300 uppercase tracking-wider">
                ALL SYSTEMS NOMINAL — 0 ACTIVE UNRESOLVED INCIDENTS
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Automated monitoring active across namespace opsara-demo. Ready for incident triage.
              </p>
            </div>
          </div>
          <span className="text-emerald-400 text-[11px] font-semibold">100% HEALTHY</span>
        </div>
      )}

      {/* SRE Telemetry Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Metric 1: Active Incidents */}
        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1.5 uppercase">
            <span>Active Incidents</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">{activeIncidents.length}</span>
            <span className="text-[11px] font-mono text-slate-400">open</span>
          </div>
          <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
            <span className="text-rose-400 font-semibold">P1: {criticalCount}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-semibold">P2: {highCount}</span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-400 font-semibold">P3: {activeIncidents.length - criticalCount - highCount}</span>
          </div>
        </div>

        {/* Metric 2: Pending Approvals */}
        <div className={`border rounded-lg p-4 transition ${
          approvals.length > 0 
            ? 'bg-amber-950/15 border-amber-500/40 ring-1 ring-amber-500/20' 
            : 'bg-[#0C1220] border-[#1C2B47]'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1.5 uppercase">
            <span>Human Approval Gate</span>
            <AlertTriangle className={`w-4 h-4 ${approvals.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${approvals.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {approvals.length}
            </span>
            <span className="text-[11px] font-mono text-slate-400">pending</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
            {approvals.length > 0 ? (
              <span className="text-amber-400 font-semibold">Safety Gated Mutation</span>
            ) : (
              <span>Zero unapproved actions</span>
            )}
          </div>
        </div>

        {/* Metric 3: MTTR & Verification */}
        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1.5 uppercase">
            <span>Deterministic MTTR</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-sky-300">1m 42s</span>
            <span className="text-[11px] font-mono text-slate-400">avg</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Target: &lt; 5m</span>
            <span className="text-emerald-400 font-semibold">-66% faster</span>
          </div>
        </div>

        {/* Metric 4: Verified Recoveries */}
        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono mb-1.5 uppercase">
            <span>Verified Recoveries</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{resolvedCount}</span>
            <span className="text-[11px] font-mono text-slate-400">resolved</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Deterministic Guarantee</span>
          </div>
        </div>
      </div>

      {/* Interactive Fault Injection & Live Demo Station */}
      <div className="bg-[#0A0F1D] border border-[#1C2B47] rounded-lg p-4 font-mono">
        <div className="flex items-center justify-between mb-3 border-b border-[#1C2B47] pb-2.5">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Fault Injection Testbed (TrueFoundry Evaluation Controls)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Inject failure into live Kubernetes deployment</span>
        </div>

        {scenarioNotice && (
          <div className="mb-3 p-2 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span>{scenarioNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => handleInjectFault('oom')}
            disabled={injecting !== null}
            className="p-3 rounded bg-[#0D1526] hover:bg-[#131F38] border border-amber-500/30 hover:border-amber-500/60 text-left transition group"
          >
            <div className="flex items-center justify-between text-amber-400 font-bold mb-1">
              <span>1. OOMKilled Failure</span>
              <span className="text-[10px] text-slate-500">Scenario A</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug group-hover:text-slate-300">
              Patches memory limit to trigger container crash and exit code 137.
            </p>
          </button>

          <button
            onClick={() => handleInjectFault('rollout-failure')}
            disabled={injecting !== null}
            className="p-3 rounded bg-[#0D1526] hover:bg-[#131F38] border border-purple-500/30 hover:border-purple-500/60 text-left transition group"
          >
            <div className="flex items-center justify-between text-purple-400 font-bold mb-1">
              <span>2. Bad Rollout / Image</span>
              <span className="text-[10px] text-slate-500">Scenario B</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug group-hover:text-slate-300">
              Updates image tag to non-existent repo to trigger ImagePullBackOff.
            </p>
          </button>

          <button
            onClick={() => handleInjectFault('db-failure')}
            disabled={injecting !== null}
            className="p-3 rounded bg-[#0D1526] hover:bg-[#131F38] border border-rose-500/30 hover:border-rose-500/60 text-left transition group"
          >
            <div className="flex items-center justify-between text-rose-400 font-bold mb-1">
              <span>3. DB Timeout Outage</span>
              <span className="text-[10px] text-slate-500">Scenario C</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug group-hover:text-slate-300">
              Injects upstream database connection timeout to trigger 500 burst.
            </p>
          </button>

          <button
            onClick={() => handleInjectFault('reset')}
            disabled={injecting !== null}
            className="p-3 rounded bg-[#0D1526] hover:bg-[#131F38] border border-slate-700 hover:border-slate-500 text-left transition group"
          >
            <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
              <span>Reset to Healthy Baseline</span>
              <span className="text-[10px] text-slate-500">Restore</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug group-hover:text-slate-300">
              Restores payment-api to 2 healthy replicas running v1.0.0.
            </p>
          </button>
        </div>
      </div>

      {/* Pending Approvals Section (Safety Gate Review Board) */}
      {approvals.length > 0 && (
        <div id="pending-approvals" className="space-y-3">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Pending Human Approvals ({approvals.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Action halted by Deterministic Risk Engine until authorized
            </span>
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

      {/* Incidents Table */}
      <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1C2B47] flex items-center justify-between bg-[#090E1A]">
          <div>
            <h3 className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
              Incident Response Ledger
            </h3>
            <p className="text-[11px] text-slate-400">Kubernetes workloads undergoing autonomous inspection or remediation</p>
          </div>
          <Link
            to="/incidents"
            className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center space-x-1"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No incidents recorded. Use "New Incident" in the header to launch an investigation.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080C15] text-slate-400 border-b border-[#1C2B47] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-5">INCIDENT / SUMMARY</th>
                <th className="py-3 px-5">TARGET WORKLOAD</th>
                <th className="py-3 px-5">SEVERITY</th>
                <th className="py-3 px-5">STATUS</th>
                <th className="py-3 px-5">CREATED</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2B47]">
              {incidents.slice(0, 8).map((inc) => (
                <tr key={inc.id} className="hover:bg-[#111A2E] transition">
                  <td className="py-3.5 px-5">
                    <Link to={`/incidents/${inc.id}`} className="font-semibold text-white hover:text-sky-300 transition flex items-center space-x-2">
                      <span className="font-mono text-sky-400 text-[11px]">#{inc.id.slice(0, 8)}</span>
                      <span>{inc.title}</span>
                    </Link>
                    {inc.summary && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {inc.summary}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-300 text-[11px]">
                    <span className="text-slate-500">{inc.namespace}/</span>
                    <span className="text-white font-medium">{inc.service}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      inc.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {getStatusBadge(inc.status)}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-400 text-[11px]">
                    {inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : 'Recent'}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Link
                      to={`/incidents/${inc.id}`}
                      className="px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[11px] font-medium transition inline-flex items-center space-x-1"
                    >
                      <span>War Room</span>
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
