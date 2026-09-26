import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Filter, ShieldCheck, User, Bot, Server } from 'lucide-react';
import { fetchAuditLogs } from '../api/client';
import { AuditLog as AuditLogType } from '../types';

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'USER':
        return <User className="w-3.5 h-3.5 text-emerald-400" />;
      case 'AGENT':
        return <Bot className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Server className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-[#1C2B47]">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Compliance & Execution Audit Trail</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Immutable ledger of all agent actions, operator approvals, and Kubernetes mutations</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#0C1220] border border-[#1C2B47] text-slate-300 hover:text-white text-xs font-mono transition hover:border-sky-500/40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg overflow-hidden shadow-2xl">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No audit records logged yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080C14] text-slate-400 border-b border-[#1C2B47] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-6">TIMESTAMP</th>
                <th className="py-3 px-6">ACTOR</th>
                <th className="py-3 px-6">OPERATION / ACTION</th>
                <th className="py-3 px-6">TARGET WORKLOAD</th>
                <th className="py-3 px-6">RISK</th>
                <th className="py-3 px-6">RESULT DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2B47] font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#111A2E] transition">
                  <td className="py-3.5 px-6 text-slate-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700/50 font-bold text-slate-200">
                      {getActorIcon(log.actor)}
                      <span>{log.actor}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-semibold text-sky-300">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-6 text-slate-300 font-mono">
                    {log.target || 'N/A'}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      log.risk === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                      log.risk === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      log.risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                      'bg-sky-500/20 text-sky-400 border-sky-500/30'
                    }`}>
                      {log.risk || 'LOW'}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-400">
                    <code className="text-[10px] bg-[#080C14] px-2 py-0.5 rounded border border-[#1C2B47] text-slate-300">
                      {log.result ? JSON.stringify(log.result).slice(0, 80) : 'OK'}
                    </code>
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
