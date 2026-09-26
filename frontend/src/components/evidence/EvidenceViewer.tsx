import React, { useState } from 'react';
import { Database, Terminal, FileText, CheckCircle2, AlertCircle, Copy, Search } from 'lucide-react';
import { Evidence } from '../../types';

interface EvidenceViewerProps {
  evidence: Evidence[];
  logs?: string;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ evidence, logs = '' }) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'logs'>('evidence');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  const filteredEvidence = filterType === 'ALL'
    ? evidence
    : evidence.filter((e) => e.type === filterType);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs
    ? logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(logSearch.toLowerCase()))
        .join('\n')
    : 'No logs collected yet.';

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'OBSERVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30">OBSERVED</span>;
      case 'INFERRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">INFERRED</span>;
      case 'PROPOSED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">PROPOSED</span>;
      case 'EXECUTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">EXECUTED</span>;
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">VERIFIED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-500/20 text-slate-400 border border-slate-500/30">{type}</span>;
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-4 border-b border-[#1E293B] bg-[#0E131F]">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'evidence'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Structured Evidence ({evidence.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-sky-400 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Container Logs</span>
          </button>
        </div>

        {activeTab === 'evidence' && (
          <div className="flex items-center space-x-1 py-2">
            {['ALL', 'OBSERVED', 'INFERRED'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                  filterType === t
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'evidence' ? (
          filteredEvidence.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              No evidence collected yet. Investigation will record observed Kubernetes facts here.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvidence.map((ev, i) => (
                <div
                  key={ev.id || i}
                  className="bg-[#0A0E17] border border-[#1E293B] rounded p-3.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeBadge(ev.type)}
                      <span className="text-xs font-mono text-slate-400">Source: {ev.source_tool}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(ev.observed_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mb-2">{ev.summary}</p>
                  {ev.payload && Object.keys(ev.payload).length > 0 && (
                    <pre className="text-[11px] font-mono bg-[#070A10] p-2.5 rounded border border-[#1B2433] text-sky-300 overflow-x-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Terminal-Style Monospace Log Viewer */
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#0A0E17] border border-[#1E293B] rounded px-3 py-1.5">
              <div className="flex items-center space-x-2 w-72">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter logs (e.g. error, connection, oom)..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-200 focus:outline-none w-full font-mono"
                />
              </div>
              <button
                onClick={handleCopyLogs}
                className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied' : 'Copy Logs'}</span>
              </button>
            </div>

            <div className="bg-[#070A10] border border-[#1E293B] rounded p-4 h-96 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 select-text">
              {filteredLogs.split('\n').map((line, idx) => {
                const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('fatal');
                const isWarn = line.toLowerCase().includes('warn');
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isError
                        ? 'text-rose-400 bg-rose-950/20'
                        : isWarn
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none mr-3 text-[10px]">{idx + 1}</span>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
