import { Activity } from 'lucide-react';

const LIFECYCLE_STAGES = [
  { label: 'Requested',  className: 'bg-ink-700/60 text-ink-300 border border-ink-600' },
  { label: 'Accepted',   className: 'bg-forge-500/10 text-forge-400 border border-forge-500/20' },
  { label: 'Executing',  className: 'bg-warn-500/10 text-warn-400 border border-warn-500/20' },
  { label: 'Completed',  className: 'bg-success-500/10 text-success-400 border border-success-500/20' },
  { label: 'Disputed',   className: 'bg-danger-500/10 text-danger-400 border border-danger-500/20' },
];

export function ResourceJobs() {
  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Resource Jobs</h1>
        <p className="text-sm text-ink-300 mt-1">
          Active and completed resource jobs between agents and machines
        </p>
      </div>

      {/* Job lifecycle table */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-100">Job Lifecycle</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {LIFECYCLE_STAGES.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stage.className}`}>
                {stage.label}
              </span>
              {i < LIFECYCLE_STAGES.length - 1 && (
                <span className="text-ink-600 text-sm">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-400">
          A job moves through these states as the resource provider picks it up, executes it, and either
          completes or enters a dispute resolution flow.
        </p>
      </div>

      {/* ResourceExecutionReceipt struct */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink-100">ResourceExecutionReceipt Struct</h2>
        <pre className="text-xs font-mono text-forge-300 bg-ink-900/60 rounded-lg p-4 border border-ink-700/50 overflow-x-auto">
{`job_id, machine_id, provider_id, consumer_id, resource_type, started_at, completed_at, status, proof_hash, disputed`}
        </pre>
      </div>

      {/* Coming-soon panel */}
      <div className="rounded-xl border-2 border-dashed border-forge-500/30 p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-forge-500/10 border border-forge-500/20 flex items-center justify-center">
          <Activity size={22} className="text-forge-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-200">Job Feed — Pending Backend</p>
          <p className="text-xs text-ink-400 mt-1">
            Live job listings will appear here once the resource market backend is connected.
          </p>
        </div>
        <code className="text-xs font-mono text-forge-400 bg-forge-500/10 px-3 py-1.5 rounded-lg border border-forge-500/20">
          /api/jobs
        </code>
      </div>
    </div>
  );
}
