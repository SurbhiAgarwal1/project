import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  BookOpen, 
  Layers, 
  FileText, 
  Settings, 
  CheckCircle2, 
  ShieldCheck,
  Cpu,
  UserCheck
} from 'lucide-react';
import { fetchIncidents, fetchPendingApprovals } from '../../api/client';

interface SidebarProps {
  clusterConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ clusterConnected }) => {
  const [activeCount, setActiveCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const [incidents, approvals] = await Promise.all([
          fetchIncidents().catch(() => []),
          fetchPendingApprovals().catch(() => [])
        ]);
        setActiveCount(incidents.filter((i: any) => !['RESOLVED', 'FAILED'].includes(i.status)).length);
        setPendingApprovalsCount(approvals.length);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Command Center', to: '/', icon: Activity },
    { 
      name: 'Incidents', 
      to: '/incidents', 
      icon: ShieldAlert,
      badge: activeCount > 0 ? activeCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    },
    { name: 'Runbook Catalog', to: '/runbooks', icon: BookOpen },
    { name: 'Kubernetes Workloads', to: '/cluster', icon: Layers },
    { name: 'Audit & Compliance', to: '/audit', icon: FileText },
    { name: 'System Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090E1A] border-r border-[#1C2B47] flex flex-col justify-between h-screen fixed left-0 top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#1C2B47] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold font-mono text-sm tracking-wider">
              OP
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-bold text-sm tracking-wide text-white">OPSARA</h1>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">
                  SRE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">TrueFoundry Hackathon</p>
            </div>
          </div>
        </div>

        {/* Pending Approvals Urgent Callout in Sidebar */}
        {pendingApprovalsCount > 0 && (
          <div className="mx-3 mt-3 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-[11px]">
            <div className="flex items-center justify-between text-amber-400 font-bold mb-1">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>HUMAN GATE ACTIVE</span>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30">
                {pendingApprovalsCount}
              </span>
            </div>
            <p className="text-slate-400 text-[10px] leading-tight">
              Mutation paused pending SRE signature.
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1 mt-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121A2D]'
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Cluster & Environment Status */}
      <div className="p-3 border-t border-[#1C2B47] bg-[#070B14] space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Cluster Status</span>
          <span className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${clusterConnected ? 'bg-emerald-400 animate-pulse-live' : 'bg-amber-400'}`}></span>
            <span className={clusterConnected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {clusterConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Target Context</span>
          <span className="text-slate-200">kind-opsara</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Safety Engine</span>
          <span className="text-sky-400">Deterministic</span>
        </div>

        {/* Operator Profile */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2 text-[11px]">
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="truncate">
            <div className="text-slate-200 font-semibold leading-none truncate">sre-lead@opsara.io</div>
            <div className="text-[10px] text-slate-400 leading-none mt-1">Tier-3 On-Call Lead</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
