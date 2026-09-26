import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Filter, Plus } from 'lucide-react';
import { fetchIncidents } from '../api/client';
import { Incident } from '../types';

interface IncidentsProps {
  onOpenCreateModal: () => void;
}

export const Incidents: React.FC<IncidentsProps> = ({ onOpenCreateModal }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents();
      setIncidents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === 'ALL'
    ? incidents
    : filter === 'ACTIVE'
    ? incidents.filter(i => !['RESOLVED', 'FAILED'].includes(i.status))
    : incidents.filter(i => i.status === filter);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Incidents Management</h1>
          <p className="text-xs text-slate-400">All registered incidents, investigations, and remediation audits</p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded text-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Incident</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
        {['ALL', 'ACTIVE', 'WAITING_FOR_APPROVAL', 'RESOLVED', 'ESCALATED'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded font-mono text-[11px] transition ${
              filter === t
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-[#111827] border border-[#1E293B]'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Incidents Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No incidents match the selected filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0E17] text-slate-400 border-b border-[#1E293B] font-mono text-[11px]">
              <tr>
                <th className="py-3 px-6">INCIDENT TITLE</th>
                <th className="py-3 px-6">SERVICE</th>
                <th className="py-3 px-6">STATUS</th>
                <th className="py-3 px-6">SEVERITY</th>
                <th className="py-3 px-6">CREATED</th>
                <th className="py-3 px-6">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-[#141B2D] transition">
                  <td className="py-4 px-6">
                    <Link to={`/incidents/${inc.id}`} className="font-semibold text-white hover:text-sky-400 transition">
                      {inc.title}
                    </Link>
                    {inc.summary && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{inc.summary}</p>
                    )}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-300">
                    {inc.namespace}/{inc.service}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      inc.status === 'WAITING_FOR_APPROVAL' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                      inc.status === 'INVESTIGATING' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                      inc.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      inc.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-slate-700/50 text-slate-300'
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-slate-300">{inc.severity}</span>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-400 text-[11px]">
                    {new Date(inc.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      to={`/incidents/${inc.id}`}
                      className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
