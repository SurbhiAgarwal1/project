import React from 'react';
import { Settings as SettingsIcon, Shield, Server, Database, Key } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-[#1E293B]">
        <h1 className="text-xl font-bold text-white tracking-tight">Platform Configuration & Safety Policies</h1>
        <p className="text-xs text-slate-400">Deterministic risk parameters, cluster targeting, and LLM orchestration settings</p>
      </div>

      <div className="space-y-6 text-xs font-mono">
        {/* Safety & Risk Engine Settings */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2 text-white font-sans font-semibold text-sm border-b border-[#1E293B] pb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Deterministic Risk Engine Policies</span>
          </div>

          <div className="space-y-3 text-slate-300">
            <div className="flex items-center justify-between p-3 bg-[#0A0E17] rounded border border-[#1E293B]">
              <div>
                <span className="text-white font-bold block">Autonomous Read-Only Investigation</span>
                <span className="text-slate-500 text-[11px]">Allow inspect_pods, get_pod_logs, get_kubernetes_events without manual approval</span>
              </div>
              <span className="text-emerald-400 font-bold">ENABLED</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0A0E17] rounded border border-[#1E293B]">
              <div>
                <span className="text-white font-bold block">Mandatory Human Gate on Mutations (MEDIUM / HIGH Risk)</span>
                <span className="text-slate-500 text-[11px]">Require explicit human operator confirmation before restart_deployment or rollback_deployment</span>
              </div>
              <span className="text-amber-400 font-bold">ENFORCED</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0A0E17] rounded border border-[#1E293B]">
              <div>
                <span className="text-white font-bold block">Destructive Action Guard (Scale to 0 / Resource Deletion)</span>
                <span className="text-slate-500 text-[11px]">Classify as CRITICAL risk with 2-step verification</span>
              </div>
              <span className="text-rose-400 font-bold">LOCKED</span>
            </div>
          </div>
        </div>

        {/* Cluster Configuration */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2 text-white font-sans font-semibold text-sm border-b border-[#1E293B] pb-3">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Kubernetes Connection & Workload Context</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#0A0E17] rounded border border-[#1E293B]">
              <span className="text-slate-500 block text-[11px] mb-1">DEFAULT NAMESPACE</span>
              <span className="text-white font-bold">opsara-demo</span>
            </div>
            <div className="p-3 bg-[#0A0E17] rounded border border-[#1E293B]">
              <span className="text-slate-500 block text-[11px] mb-1">CLUSTER NAME</span>
              <span className="text-white font-bold">kind-opsara</span>
            </div>
          </div>
        </div>

        {/* Agent & Model Settings */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2 text-white font-sans font-semibold text-sm border-b border-[#1E293B] pb-3">
            <Key className="w-4 h-4 text-purple-400" />
            <span>LLM Agent Settings</span>
          </div>

          <div className="p-3 bg-[#0A0E17] rounded border border-[#1E293B] space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">REASONING ENGINE:</span>
              <span className="text-slate-200">OpenAI gpt-4o-mini (via server environment)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">NO-HALLUCINATION POLICY:</span>
              <span className="text-emerald-400">STRICT (Grounded in Tool Evidence)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">LOCAL OFFLINE FALLBACK:</span>
              <span className="text-sky-400">AUTOMATIC (Heuristic & Rule Engine)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
