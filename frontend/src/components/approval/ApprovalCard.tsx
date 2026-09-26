import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';
import { ApprovalRequest } from '../../types';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onApprove,
  onReject
}) => {
  const [submitting, setSubmitting] = useState(false);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">MEDIUM RISK</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">LOW RISK</span>;
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(approval.id);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await onReject(approval.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#121826] border-2 border-amber-500/40 rounded-lg p-5 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500"></div>

      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-[#1E293B]">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
              Action Requires Operator Approval
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Deterministic Safety Gate: Mutating operation paused awaiting authorization
            </p>
          </div>
        </div>
        <div>
          {getRiskBadge(approval.risk_level)}
        </div>
      </div>

      {/* Body Details */}
      <div className="py-4 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3 bg-[#0A0E17]/60 p-3 rounded border border-[#1E293B] font-mono">
          <div>
            <span className="text-slate-400 block text-[11px]">PROPOSED ACTION</span>
            <span className="text-sky-300 font-semibold text-sm">{approval.action_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">TARGET WORKLOAD</span>
            <span className="text-white font-semibold text-sm">{approval.namespace}/{approval.target}</span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 block font-medium mb-1">Reason for Remediation</span>
          <p className="text-slate-200 bg-[#0E1422] p-2.5 rounded border border-[#1E293B] leading-relaxed">
            {approval.reason}
          </p>
        </div>

        {approval.expected_impact && (
          <div>
            <span className="text-slate-400 block font-medium mb-1">Expected Infrastructure Impact</span>
            <p className="text-slate-300 font-mono text-[11px]">
              • {approval.expected_impact}
            </p>
          </div>
        )}

        <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1 font-mono">
          <span className="flex items-center space-x-1">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rollback: {approval.rollback_available ? 'Available' : 'None'}</span>
          </span>
          <span>•</span>
          <span>Idempotent Execution: Guaranteed</span>
        </div>
      </div>

      {/* Actions */}
      {approval.status === 'PENDING' ? (
        <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end space-x-3">
          <button
            onClick={handleReject}
            disabled={submitting}
            className="px-4 py-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold tracking-wide transition flex items-center space-x-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject Action</span>
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Execute</span>
          </button>
        </div>
      ) : (
        <div className="pt-3 border-t border-[#1E293B] flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Resolution Status:</span>
          <span className={`font-bold ${approval.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {approval.status}
          </span>
        </div>
      )}
    </div>
  );
};
