import React, { useState } from 'react';
import { Plus, Play, RefreshCw, AlertTriangle } from 'lucide-react';
import { triggerScenario } from '../../api/client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenCreateModal?: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
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
      alert(`Error triggering scenario: ${e.message}`);
    } finally {
      setScenarioLoading(false);
    }
  };

  return (
    <header className="h-16 border-b border-[#1E293B] bg-[#0E131F]/80 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {scenarioNotice && (
          <div className="text-xs bg-sky-500/10 border border-sky-500/30 text-sky-400 px-3 py-1.5 rounded flex items-center space-x-1.5 animate-fadeIn font-mono">
            <span>{scenarioNotice}</span>
          </div>
        )}

        {/* Demo Scenario Controller */}
        <div className="flex items-center bg-[#141B2D] border border-[#1E293B] rounded p-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400 px-2 uppercase tracking-wider">Simulate:</span>
          <button
            onClick={() => handleTrigger('oom')}
            disabled={scenarioLoading}
            className="px-2.5 py-1 text-amber-400 hover:bg-amber-400/10 rounded font-medium transition"
          >
            OOM Crash
          </button>
          <button
            onClick={() => handleTrigger('db-failure')}
            disabled={scenarioLoading}
            className="px-2.5 py-1 text-rose-400 hover:bg-rose-400/10 rounded font-medium transition"
          >
            DB Failure
          </button>
          <button
            onClick={() => handleTrigger('rollout-failure')}
            disabled={scenarioLoading}
            className="px-2.5 py-1 text-purple-400 hover:bg-purple-400/10 rounded font-medium transition"
          >
            Failed Rollout
          </button>
          <button
            onClick={() => handleTrigger('reset')}
            disabled={scenarioLoading}
            className="px-2 py-1 text-slate-300 hover:bg-slate-700/50 rounded font-mono text-[11px] transition"
            title="Reset demo to healthy baseline"
          >
            Reset
          </button>
        </div>

        {onOpenCreateModal && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 px-3.5 py-1.5 rounded text-xs font-semibold tracking-wide transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Incident</span>
          </button>
        )}
      </div>
    </header>
  );
};
