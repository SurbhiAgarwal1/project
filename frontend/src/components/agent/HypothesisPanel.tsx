import React from 'react';
import { Brain, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface HypothesisPanelProps {
  hypothesis?: {
    likely_cause: string;
    confidence: number;
    summary: string;
    supporting_evidence: string[];
    contradicting_evidence: string[];
  };
  status: string;
}

export const HypothesisPanel: React.FC<HypothesisPanelProps> = ({ hypothesis, status }) => {
  if (!hypothesis) {
    return (
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono">
          <Brain className="w-4 h-4 text-slate-500" />
          <span>Awaiting agent investigation & hypothesis synthesis...</span>
        </div>
      </div>
    );
  }

  const confidencePct = Math.round(hypothesis.confidence * 100);

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Agent Incident Analysis & Hypothesis
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400">Confidence:</span>
          <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            {confidencePct}%
          </span>
        </div>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1">
            Likely Root Cause
          </span>
          <div className="text-sm font-semibold text-white bg-[#0A0E17] p-2.5 rounded border border-[#1E293B]">
            {hypothesis.likely_cause}
          </div>
        </div>

        <div>
          <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1">
            Why / Technical Assessment
          </span>
          <p className="text-slate-200 leading-relaxed bg-[#0A0E17]/60 p-2.5 rounded border border-[#1E293B]">
            {hypothesis.summary}
          </p>
        </div>

        {hypothesis.supporting_evidence && hypothesis.supporting_evidence.length > 0 && (
          <div>
            <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1">
              Supporting Cluster Evidence
            </span>
            <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
              {hypothesis.supporting_evidence.map((ev, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hypothesis.contradicting_evidence && hypothesis.contradicting_evidence.length > 0 && (
          <div>
            <span className="text-slate-400 text-[11px] font-mono uppercase block mb-1">
              Contradicting Evidence
            </span>
            <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
              {hypothesis.contradicting_evidence.map((ev, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
