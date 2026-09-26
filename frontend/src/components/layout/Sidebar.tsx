import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  BookOpen, 
  Layers, 
  FileText, 
  Settings, 
  CheckCircle2, 
  Radio
} from 'lucide-react';

interface SidebarProps {
  clusterConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ clusterConnected }) => {
  const navItems = [
    { name: 'Overview', to: '/', icon: Activity },
    { name: 'Incidents', to: '/incidents', icon: ShieldAlert },
    { name: 'Runbooks', to: '/runbooks', icon: BookOpen },
    { name: 'Cluster', to: '/cluster', icon: Layers },
    { name: 'Audit Log', to: '/audit', icon: FileText },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0E131F] border-r border-[#1E293B] flex flex-col justify-between h-screen fixed left-0 top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1E293B]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
              OP
            </div>
            <div>
              <h1 className="font-semibold text-base tracking-wide text-white">OPSARA</h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Agentic SRE Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Cluster & Environment Status */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0A0E17]/60 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Cluster</span>
          <span className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className={`w-2 h-2 rounded-full ${clusterConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className={clusterConnected ? 'text-emerald-400' : 'text-amber-400'}>
              {clusterConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Target</span>
          <span className="font-mono text-slate-300 text-[11px]">kind / opsara</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Operator</span>
          <span className="font-mono text-slate-300 text-[11px]">SRE On-Call</span>
        </div>
      </div>
    </aside>
  );
};
