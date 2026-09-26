import React, { useState } from 'react';
import { X, ShieldAlert, Play } from 'lucide-react';
import { createIncident, startInvestigation } from '../../api/client';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (incidentId: string) => void;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [title, setTitle] = useState('Payment API degraded / failing health probe');
  const [service, setService] = useState('payment-api');
  const [namespace, setNamespace] = useState('opsara-demo');
  const [runbookId, setRunbookId] = useState('payment-api-recovery');
  const [severity, setSeverity] = useState('HIGH');
  const [autoStart, setAutoStart] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createIncident({
        title,
        service,
        namespace,
        severity,
        runbook_id: runbookId
      });

      if (autoStart) {
        await startInvestigation(res.id);
      }
      onCreated(res.id);
      onClose();
    } catch (err: any) {
      alert(`Error creating incident: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0E131F]">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-sm text-white">Create New Kubernetes Incident</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Incident Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0A0E17] border border-[#1E293B] rounded px-3 py-2 text-white font-sans focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Target Service</label>
              <input
                type="text"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Namespace</label>
              <input
                type="text"
                required
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Operational Runbook</label>
              <select
                value={runbookId}
                onChange={(e) => setRunbookId(e.target.value)}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="payment-api-recovery">Payment API Recovery</option>
                <option value="oom-recovery">OOM Recovery</option>
                <option value="failed-rollout">Failed Rollout</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-[#0A0E17] border border-[#1E293B] rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoStart"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="rounded bg-[#0A0E17] border-slate-700 text-sky-500 focus:ring-0"
            />
            <label htmlFor="autoStart" className="text-slate-300 select-none cursor-pointer">
              Automatically trigger agent investigation upon creation
            </label>
          </div>

          <div className="pt-4 border-t border-[#1E293B] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{autoStart ? 'Create & Investigate' : 'Create Incident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
