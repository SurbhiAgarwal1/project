import React, { useState } from 'react';
import { Plus, Zap, RefreshCw, AlertTriangle, ShieldCheck, Activity, Terminal } from 'lucide-react';
import { triggerScenario } from '../../api/client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  clusterConnected?: boolean;
  onOpenCreateModal?: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  clusterConnected = true,
  onOpenCreateModal,
  onRefresh
}) => {
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioNotice, setScenarioNotice] = useState<string | null>(null);

  const handleTrigger = async (type: 'oom' | 'db-failure' | 'rollout-failure' | 'reset') => {
    try {
      setScenarioLoading(true);
      const res = await triggerScenario(type);
      setScenarioNotice(res.message || `Scenario ${type} triggered`);
      setTimeout(() => setScenarioNotice(null), 4000);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(`Fault Injection Notice: ${e.message || 'Cluster disconnected or error'}`);
    } finally {
      setScenarioLoading(false);
    }
  };

  return (
    <header className="h-14 border-b border-[#1C2B47] bg-[#0A0F1D]/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb & Scope */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500 uppercase tracking-wider font-semibold">OPSARA</span>
          <span className="text-slate-700">/</span>
          <span className="text-white font-semibold tracking-tight">{title}</span>
        </div>
        {subtitle && (
          <span className="hidden md:inline-block text-[11px] text-slate-400 font-mono pl-2 border-l border-slate-800">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Live Cluster Pill */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#0D1527] border border-[#1C2B47] text-[11px] font-mono">
          <span className={`w-2 h-2 rounded-full ${clusterConnected ? 'bg-emerald-400 animate-pulse-live' : 'bg-amber-400'}`}></span>
          <span className={clusterConnected ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
            {clusterConnected ? 'K8S: CONNECTED' : 'K8S: OFFLINE'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">ns: opsara-demo</span>
        </div>

        {scenarioNotice && (
          <div className="text-[11px] bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2.5 py-1 rounded flex items-center space-x-1.5 font-mono">
            <span>{scenarioNotice}</span>
          </div>
        )}

        {/* Demo Fault Injection Console */}
        <div className="flex items-center bg-[#0D1527] border border-[#1C2B47] rounded p-0.5 text-xs font-mono">
          <div className="flex items-center space-x-1 px-2 text-[10px] text-slate-400 uppercase tracking-wider">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Simulate:</span>
          </div>
          <button
            onClick={() => handleTrigger('oom')}
            disabled={scenarioLoading}
            className="px-2 py-0.5 text-[11px] text-amber-400 hover:bg-amber-400/10 rounded transition"
            title="Inject memory exhaustion into payment-api container"
          >
            OOM Crash
          </button>
          <button
            onClick={() => handleTrigger('db-failure')}
            disabled={scenarioLoading}
            className="px-2 py-0.5 text-[11px] text-rose-400 hover:bg-rose-400/10 rounded transition"
            title="Simulate downstream PostgreSQL database connection outage"
          >
            DB Failure
          </button>
          <button
            onClick={() => handleTrigger('rollout-failure')}
            disabled={scenarioLoading}
            className="px-2 py-0.5 text-[11px] text-purple-400 hover:bg-purple-400/10 rounded transition"
            title="Deploy invalid container image tag to cause ImagePullBackOff"
          >
            Bad Rollout
          </button>
          <button
            onClick={() => handleTrigger('reset')}
            disabled={scenarioLoading}
            className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 rounded transition border-l border-slate-800"
            title="Reset demo deployment to healthy baseline state"
          >
            Reset
          </button>
        </div>

        {onOpenCreateModal && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 px-3 py-1 rounded text-xs font-semibold tracking-wide transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Incident</span>
          </button>
        )}
      </div>
    </header>
  );
};
