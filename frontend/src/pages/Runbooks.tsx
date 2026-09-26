import React, { useEffect, useState } from 'react';
import { BookOpen, Shield, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { fetchRunbooks } from '../api/client';
import { Runbook } from '../types';

export const Runbooks: React.FC = () => {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [selected, setSelected] = useState<Runbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRunbooks()
      .then((data) => {
        setRunbooks(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-[#1C2B47] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Operational Runbook Catalog</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Declarative operational procedures executed conditionally by the agent</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Runbook List */}
        <div className="col-span-5 space-y-3">
          {runbooks.map((rb) => (
            <div
              key={rb.id}
              onClick={() => setSelected(rb)}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                selected?.id === rb.id
                  ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg shadow-sky-500/5'
                  : 'bg-[#0C1220] border-[#1C2B47] text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-sm">{rb.name}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">{rb.step_count} steps</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{rb.description}</p>
              <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                <span>Target: <strong className="text-slate-200">{rb.service}</strong></span>
                <span>•</span>
                <span>Namespace: <strong className="text-slate-200">{rb.namespace}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Runbook Step Flow */}
        <div className="col-span-7">
          {selected && (
            <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-6 space-y-5 shadow-2xl">
              <div className="border-b border-[#1C2B47] pb-4">
                <h3 className="text-base font-bold text-white mb-1">{selected.name}</h3>
                <p className="text-xs text-slate-400">{selected.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Execution Steps Sequence
                </h4>

                <div className="space-y-2.5">
                  {selected.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="bg-[#0A0E17] border border-[#1E293B] rounded p-3 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-500 text-[11px]">{idx + 1}.</span>
                          <span className="font-mono font-semibold text-sky-300">{step.action}</span>
                        </div>
                        {step.description && (
                          <p className="text-slate-400 text-[11px] pl-4">{step.description}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          step.risk === 'READ_ONLY' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          step.risk === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {step.risk}
                        </span>
                        {step.requires_approval && (
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            APPROVAL GATE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
