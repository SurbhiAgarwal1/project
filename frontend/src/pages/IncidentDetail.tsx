import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Check, 
  X,
  RotateCcw
} from 'lucide-react';
import { fetchIncidentById, startInvestigation, approveAction, rejectAction } from '../api/client';
import { Incident, ApprovalRequest } from '../types';
import { VerticalTimeline } from '../components/timeline/VerticalTimeline';
import { HypothesisPanel } from '../components/agent/HypothesisPanel';
import { EvidenceViewer } from '../components/evidence/EvidenceViewer';
import { ApprovalCard } from '../components/approval/ApprovalCard';

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadIncident = async () => {
    if (!id) return;
    try {
      const data = await fetchIncidentById(id);
      setIncident(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();

    // Setup live SSE stream for real-time updates
    if (!id) return;
    const eventSource = new EventSource(`/api/incidents/${id}/events/stream`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('Live SSE Event:', payload);
        // Refresh incident data on meaningful state transition
        loadIncident();
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    const interval = setInterval(loadIncident, 4000);
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [id]);

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    try {
      await startInvestigation(id);
      await loadIncident();
    } finally {
      setStarting(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    await approveAction(approvalId);
    await loadIncident();
  };

  const handleReject = async (approvalId: string) => {
    await rejectAction(approvalId);
    await loadIncident();
  };

  if (loading || !incident) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Loading incident details...
      </div>
    );
  }

  const pendingApproval = incident.approvals?.find(a => a.status === 'PENDING');
  const latestVerification = incident.verifications && incident.verifications.length > 0 
    ? incident.verifications[incident.verifications.length - 1] 
    : null;

  // Compute current stage in SRE pipeline
  const getPipelineStage = () => {
    switch (incident.status) {
      case 'OPEN':
        return 1;
      case 'INVESTIGATING':
        return 2;
      case 'WAITING_FOR_APPROVAL':
        return 4;
      case 'EXECUTING':
        return 5;
      case 'VERIFYING':
        return 6;
      case 'RESOLVED':
        return 7;
      case 'ESCALATED':
      case 'FAILED':
        return 4;
      default:
        return 1;
    }
  };

  const currentStage = getPipelineStage();

  const pipelineSteps = [
    { num: 1, label: 'Detection' },
    { num: 2, label: 'Tool Inspection' },
    { num: 3, label: 'Evidence Synthesis' },
    { num: 4, label: 'Safety Gate' },
    { num: 5, label: 'Mutation' },
    { num: 6, label: 'Verification' },
    { num: 7, label: 'Resolved' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Status Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1C2B47]">
        <div className="flex items-center space-x-4">
          <Link
            to="/incidents"
            className="p-2 rounded bg-[#0D1526] hover:bg-[#131F38] text-slate-400 hover:text-white border border-[#1C2B47] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="font-mono text-sky-400 text-sm font-bold">#{incident.id.slice(0, 8)}</span>
              <h1 className="text-lg font-bold text-white tracking-tight">{incident.title}</h1>
              <span className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold ${
                incident.status === 'WAITING_FOR_APPROVAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' :
                incident.status === 'INVESTIGATING' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                incident.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                incident.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {incident.status}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
              <span>Target: <strong className="text-slate-200">{incident.namespace}/{incident.service}</strong></span>
              <span>•</span>
              <span>Severity: <strong className="text-amber-400">{incident.severity}</strong></span>
              <span>•</span>
              <span>Created: {new Date(incident.created_at).toLocaleTimeString()}</span>
              <span>•</span>
              <span>Safety Model: <strong className="text-sky-400">Deterministic Guardrails</strong></span>
            </div>
          </div>
        </div>

        <div>
          {incident.status === 'OPEN' && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded text-xs transition shadow-lg shadow-sky-500/20 font-mono uppercase tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Engage SRE Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* SRE Agent Execution Pipeline Stepper */}
      <div className="bg-[#0C1220] border border-[#1C2B47] rounded-lg p-3.5 font-mono">
        <div className="flex items-center justify-between text-[11px] mb-2 text-slate-400">
          <span className="uppercase font-semibold tracking-wider text-slate-300">
            Agentic Incident Response Pipeline (TrueFoundry Runbook Executor)
          </span>
          <span>Stage {currentStage} of 7</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {pipelineSteps.map((step) => {
            const isCompleted = currentStage > step.num;
            const isCurrent = currentStage === step.num;
            return (
              <div 
                key={step.num}
                className={`p-2 rounded border text-center transition ${
                  isCurrent
                    ? 'bg-sky-500/15 border-sky-400 text-sky-300 ring-1 ring-sky-400/30'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#080C15] border-slate-800 text-slate-600'
                }`}
              >
                <div className="text-[10px] uppercase font-bold flex items-center justify-center space-x-1">
                  {isCompleted && <Check className="w-3 h-3 text-emerald-400" />}
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>}
                  <span>{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Timeline, Hypothesis, Evidence */}
        <div className="col-span-8 space-y-6">
          {/* Agent Hypothesis Panel */}
          <HypothesisPanel
            hypothesis={incident.hypothesis}
            status={incident.status}
          />

          {/* Structured Evidence & Log Viewer */}
          <EvidenceViewer
            evidence={incident.evidence || []}
            logs={incident.events?.find(e => e.metadata?.logs)?.metadata?.logs || ''}
          />

          {/* Vertical Execution Timeline */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5">
            <VerticalTimeline events={incident.events || []} />
          </div>
        </div>

        {/* Right Column: Actions, Approval Card, Verification */}
        <div className="col-span-4 space-y-6">
          {/* Approval Card (if approval pending) */}
          {pendingApproval && (
            <ApprovalCard
              approval={pendingApproval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {/* Verification Result Card */}
          {latestVerification && (
            <div className={`border rounded-lg p-5 ${
              latestVerification.status === 'PASSED'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center space-x-2 mb-3">
                {latestVerification.status === 'PASSED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <h4 className="font-bold text-xs uppercase tracking-wider font-mono">
                  Deterministic Verification: {latestVerification.status}
                </h4>
              </div>
              <p className="text-xs mb-3 text-slate-200">{latestVerification.summary}</p>
              
              <div className="space-y-1.5 text-[11px] font-mono">
                {latestVerification.checks?.items?.map((check, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/30 p-1.5 rounded">
                    <span>{check.name}</span>
                    <span className={check.passed ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                      {check.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incident Meta Box */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-3 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono border-b border-[#1E293B] pb-2">
              Incident Context
            </h4>
            <div className="space-y-2 text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Runbook:</span>
                <span>{incident.runbook_id || 'payment-api-recovery'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Service:</span>
                <span>{incident.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Namespace:</span>
                <span>{incident.namespace}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Safety Model:</span>
                <span className="text-sky-400">Strict Human Gate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
