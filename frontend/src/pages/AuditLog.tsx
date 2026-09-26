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
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Compliance & Execution Audit Trail</h1>
          <p className="text-xs text-slate-400">Immutable ledger of all agent actions, operator approvals, and mutations</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#111827] border border-[#1E293B] text-slate-300 hover:text-white text-xs font-mono transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No audit records logged yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0E17] text-slate-400 border-b border-[#1E293B] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-6">TIMESTAMP</th>
                <th className="py-3 px-6">ACTOR</th>
                <th className="py-3 px-6">OPERATION / ACTION</th>
                <th className="py-3 px-6">TARGET WORKLOAD</th>
                <th className="py-3 px-6">RISK</th>
                <th className="py-3 px-6">RESULT DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#141B2D] transition">
                  <td className="py-3.5 px-6 text-slate-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="flex items-center space-x-1.5 font-bold text-slate-200">
                      {getActorIcon(log.actor)}
                      <span>{log.actor}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-semibold text-sky-300">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-6 text-slate-300">
                    {log.target || 'N/A'}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.risk === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                      log.risk === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                      log.risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-sky-500/20 text-sky-400'
                    }`}>
                      {log.risk || 'LOW'}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-400">
                    {log.result ? JSON.stringify(log.result).slice(0, 80) : 'OK'}
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
