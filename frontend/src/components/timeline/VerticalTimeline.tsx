import React from 'react';
import { 
  Search, 
  Database, 
  Brain, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  ShieldCheck, 
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';
import { IncidentEvent } from '../../types';

interface VerticalTimelineProps {
  events: IncidentEvent[];
}

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ events }) => {
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'INVESTIGATION':
      case 'TOOL_EXECUTION':
        return {
          icon: Search,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
          label: 'INVESTIGATION'
        };
      case 'EVIDENCE':
        return {
          icon: Database,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
          label: 'EVIDENCE'
        };
      case 'ANALYSIS':
        return {
          icon: Brain,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          label: 'ANALYSIS'
        };
      case 'APPROVAL_REQUIRED':
      case 'PROPOSAL':
        return {
          icon: ShieldAlert,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          label: 'GATE'
        };
      case 'APPROVED':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          label: 'APPROVED'
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          label: 'REJECTED'
        };
      case 'EXECUTION':
      case 'EXECUTION_COMPLETE':
        return {
          icon: Play,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          label: 'EXECUTION'
        };
      case 'VERIFICATION_SUCCESS':
      case 'RESOLUTION':
        return {
          icon: ShieldCheck,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          label: 'RESOLVED'
        };
      case 'VERIFICATION_FAILURE':
      case 'ESCALATION':
        return {
          icon: AlertTriangle,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          label: 'ESCALATION'
        };
      default:
        return {
          icon: Clock,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
          label: type
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Incident Audit & Execution Timeline
        </h4>
        <span className="text-[11px] text-slate-500 font-mono">{events.length} Events</span>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs font-mono">
          No investigation events recorded yet. Click "Start Investigation" to begin.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#1E293B]">
          {events.map((ev, idx) => {
            const badge = getEventBadge(ev.type);
            const Icon = badge.icon;
            const timeFormatted = ev.timestamp?.includes('T')
              ? new Date(ev.timestamp).toLocaleTimeString()
              : ev.timestamp;

            return (
              <div key={ev.id || idx} className="relative group">
                {/* Node icon */}
                <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${badge.color}`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>

                {/* Content */}
                <div className="bg-[#111827] border border-[#1E293B] rounded p-3 text-xs hover:border-slate-700 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{timeFormatted}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed font-sans">{ev.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
