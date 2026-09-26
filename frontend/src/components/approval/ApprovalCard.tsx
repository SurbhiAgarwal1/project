import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, ArrowRight, RotateCcw, Lock, FileCode, CheckSquare, Square } from 'lucide-react';
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
  const [showPatch, setShowPatch] = useState(true);
  const [signedOff, setSignedOff] = useState(false);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">P1 CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">P2 HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">P3 MEDIUM RISK</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">LOW RISK</span>;
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

  // Generate simulated patch preview for the proposed action
  const getPatchPreview = () => {
    if (approval.action_type === 'ROLLBACK_DEPLOYMENT') {
      return `# Kubernetes Rollout Undo
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${approval.target}
  namespace: ${approval.namespace}
# Action: Rollback to previous deployment revision (undo invalid image tag)
spec:
  revision: PREVIOUS`;
    }
    return `# Kubernetes Strategic Merge Patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${approval.target}
  namespace: ${approval.namespace}
spec:
  template:
    spec:
      containers:
        - name: ${approval.target}
+         resources:
+           limits:
+             memory: "512Mi"
+             cpu: "500m"
+           requests:
+             memory: "256Mi"
+             cpu: "100m"
+         env:
+           - name: APP_MODE
+             value: "normal"`;
  };

  return (
    <div className="bg-[#0C1220] border-2 border-amber-500/40 rounded-lg p-5 shadow-2xl relative overflow-hidden font-mono">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500"></div>

      {/* Header */}
      <div className="flex items-start justify-between pb-3.5 border-b border-[#1C2B47]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                SRE Change Control: Operator Authorization Required
              </h3>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                GATE #SEC-01
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Deterministic Safety Engine: Mutating action halted. Human operator must sign off.
            </p>
          </div>
        </div>
        <div>
          {getRiskBadge(approval.risk_level)}
        </div>
      </div>

      {/* Body Details */}
      <div className="py-4 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3 bg-[#070B14] p-3 rounded border border-[#1C2B47]">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">PROPOSED MUTATION</span>
            <span className="text-sky-300 font-bold text-sm">{approval.action_type}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">TARGET RESOURCE</span>
            <span className="text-white font-bold text-sm">{approval.namespace}/{approval.target}</span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 block font-semibold text-[11px] mb-1">Remediation Justification</span>
          <p className="text-slate-200 bg-[#090E1A] p-2.5 rounded border border-[#1C2B47] leading-relaxed text-xs">
            {approval.reason}
          </p>
        </div>

        {approval.expected_impact && (
          <div className="bg-[#090E1A] p-2.5 rounded border border-[#1C2B47] text-[11px]">
            <span className="text-slate-400 block font-semibold mb-1">Blast Radius Assessment</span>
            <span className="text-slate-300">
              • {approval.expected_impact}
            </span>
          </div>
        )}

        {/* Patch Diff Viewer Toggle */}
        <div className="border border-[#1C2B47] rounded bg-[#070B14] overflow-hidden">
          <div 
            onClick={() => setShowPatch(!showPatch)}
            className="px-3 py-2 bg-[#090E1A] border-b border-[#1C2B47] flex items-center justify-between cursor-pointer text-[11px] text-slate-300 hover:text-white"
          >
            <span className="flex items-center space-x-1.5 font-bold">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Kubernetes Strategic Mutation Diff</span>
            </span>
            <span className="text-[10px] text-sky-400">{showPatch ? 'Hide Diff' : 'View Diff'}</span>
          </div>
          {showPatch && (
            <pre className="p-3 text-[11px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre font-mono bg-[#05080F]">
              {getPatchPreview().split('\n').map((line, idx) => {
                const isAdd = line.startsWith('+');
                const isComment = line.startsWith('#');
                return (
                  <div key={idx} className={isAdd ? 'text-emerald-400 bg-emerald-500/10 -mx-3 px-3' : isComment ? 'text-slate-500' : 'text-slate-300'}>
                    {line}
                  </div>
                );
              })}
            </pre>
          )}
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
          <span className="flex items-center space-x-1">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rollback Guarantee: {approval.rollback_available ? 'Available' : 'None'}</span>
          </span>
          <span>•</span>
          <span className="text-emerald-400">Idempotent Execution: Guaranteed</span>
        </div>
      </div>

      {/* Operator Sign-off & Actions */}
      {approval.status === 'PENDING' ? (
        <div className="pt-3 border-t border-[#1C2B47] space-y-3">
          <label 
            onClick={() => setSignedOff(!signedOff)}
            className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer select-none"
          >
            {signedOff ? (
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0" />
            )}
            <span>
              I have inspected the resource target, blast radius, and approve mutation execution on cluster <strong>kind-opsara</strong>.
            </span>
          </label>

          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="px-4 py-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold tracking-wide transition flex items-center space-x-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject & Escalate</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || !signedOff}
              className={`px-5 py-2 rounded font-bold text-xs tracking-wide transition flex items-center space-x-1.5 shadow-lg ${
                signedOff
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorize & Execute Mutation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t border-[#1C2B47] flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Resolution Status:</span>
          <span className={`font-bold ${approval.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {approval.status}
          </span>
        </div>
      )}
    </div>
  );
};
