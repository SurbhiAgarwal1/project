import React, { useEffect, useState } from 'react';
import { Layers, Server, RefreshCw, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';
import { fetchClusterStatus, fetchClusterPods, fetchClusterDeployments, fetchPodLogs } from '../api/client';
import { ClusterStatus, PodInfo, DeploymentInfo } from '../types';

export const Cluster: React.FC = () => {
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [podLogs, setPodLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadCluster = async () => {
    try {
      setLoading(true);
      const [sRes, pRes, dRes] = await Promise.all([
        fetchClusterStatus().catch(() => null),
        fetchClusterPods().catch(() => []),
        fetchClusterDeployments().catch(() => [])
      ]);
      setStatus(sRes);
      setPods(pRes);
      setDeployments(dRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCluster();
    const interval = setInterval(loadCluster, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInspectPodLogs = async (podName: string) => {
    setSelectedPod(podName);
    try {
      const res = await fetchPodLogs(podName);
      setPodLogs(res.logs);
    } catch (e: any) {
      setPodLogs(`Error fetching logs: ${e.message}`);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Live Kubernetes Infrastructure</h1>
          <p className="text-xs text-slate-400">Direct cluster state queried via official Kubernetes API client</p>
        </div>
        <button
          onClick={loadCluster}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#111827] border border-[#1E293B] text-slate-300 hover:text-white text-xs font-mono transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Cluster Meta Row */}
      <div className="grid grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <span className="text-slate-500 block mb-1">CONNECTION STATE</span>
          <div className="flex items-center space-x-2 font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${status?.connected ? 'bg-emerald-400 animate-pulse-live' : 'bg-amber-400'}`}></span>
            <span className={status?.connected ? 'text-emerald-400' : 'text-amber-400'}>
              {status?.connected ? 'CONNECTED (READY)' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <span className="text-slate-500 block mb-1">SERVER VERSION</span>
          <div className="text-slate-200 font-semibold">{status?.server_version || 'v1.32.2 (kind)'}</div>
        </div>

        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <span className="text-slate-500 block mb-1">CONTROL PLANE NODES</span>
          <div className="text-slate-200 font-semibold">{status?.nodes_count || 1} active node(s)</div>
        </div>

        <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-4">
          <span className="text-slate-500 block mb-1">ACTIVE NAMESPACE</span>
          <div className="text-sky-400 font-semibold">opsara-demo</div>
        </div>
      </div>

      {/* Cluster Connection Guidance if offline */}
      {!status?.connected && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4 font-mono text-xs">
          <div className="flex items-center space-x-2 text-amber-400 font-bold mb-1">
            <AlertCircle className="w-4 h-4" />
            <span>Kubernetes API Offline or Unreachable</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Opsara connects directly to your live Kubernetes cluster. When ready to run live in-cluster tests, start your cluster using any standard local tool:
          </p>
          <div className="mt-2 p-2 bg-[#05080F] rounded border border-slate-800 text-[11px] text-sky-300 select-all">
            minikube start &nbsp;&nbsp;|&nbsp;&nbsp; kind create cluster --name opsara &nbsp;&nbsp;|&nbsp;&nbsp; kubectl apply -f k8s/demo-workload.yaml
          </div>
        </div>
      )}

      {/* Deployments Table */}
      <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg overflow-hidden">
        <div className="px-6 py-3.5 border-b border-[#1C2B47] bg-[#090E1A] flex items-center justify-between">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300 font-mono">
            Workload Deployments ({deployments.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Namespace: opsara-demo</span>
        </div>

        {deployments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No active deployments discovered in namespace opsara-demo.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0E17] text-slate-400 border-b border-[#1E293B] font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-6">DEPLOYMENT</th>
                <th className="py-2.5 px-6">REPLICAS (READY/DESIRED)</th>
                <th className="py-2.5 px-6">AVAILABLE</th>
                <th className="py-2.5 px-6">IMAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {deployments.map((d) => (
                <tr key={d.name} className="hover:bg-[#141B2D] transition">
                  <td className="py-3 px-6 font-semibold text-white font-mono">{d.name}</td>
                  <td className="py-3 px-6 font-mono">
                    <span className={d.ready_replicas >= d.desired_replicas ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {d.ready_replicas}/{d.desired_replicas}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-mono text-slate-300">{d.available_replicas}</td>
                  <td className="py-3 px-6 font-mono text-slate-400 text-[11px]">{d.images.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pods Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="px-6 py-3.5 border-b border-[#1E293B] bg-[#0E131F] flex items-center justify-between">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300 font-mono">
            Workload Pods ({pods.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Live Pods</span>
        </div>

        {pods.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No active pods detected in namespace opsara-demo.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0E17] text-slate-400 border-b border-[#1E293B] font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-6">POD NAME</th>
                <th className="py-2.5 px-6">PHASE</th>
                <th className="py-2.5 px-6">READY</th>
                <th className="py-2.5 px-6">RESTARTS</th>
                <th className="py-2.5 px-6">TERMINATION REASON</th>
                <th className="py-2.5 px-6">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {pods.map((p) => (
                <tr key={p.name} className="hover:bg-[#141B2D] transition">
                  <td className="py-3 px-6 font-mono font-medium text-white">{p.name}</td>
                  <td className="py-3 px-6 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.phase === 'Running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {p.phase}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-mono">
                    <span className={p.ready ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                      {p.ready ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-mono text-slate-300">{p.restart_count}</td>
                  <td className="py-3 px-6 font-mono">
                    {p.termination_reason ? (
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        {p.termination_reason}
                      </span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => handleInspectPodLogs(p.name)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-mono text-[11px] transition flex items-center space-x-1"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Logs</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Pod Logs Viewer */}
      {selectedPod && (
        <div className="bg-[#070A10] border border-[#1E293B] rounded-lg p-5 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 text-xs">
            <span className="text-sky-400 font-bold">Logs: {selectedPod}</span>
            <button
              onClick={() => setSelectedPod(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close
            </button>
          </div>
          <pre className="text-xs text-slate-300 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {podLogs}
          </pre>
        </div>
      )}
    </div>
  );
};
