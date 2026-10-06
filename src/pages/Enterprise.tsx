import { Building2, CheckCircle2 } from 'lucide-react';

const EAT_COMPONENTS: { label: string; implemented: boolean }[] = [
  { label: 'EnterpriseId',             implemented: true },
  { label: 'ControllerBinding',        implemented: true },
  { label: 'EnterpriseCapabilitySet',  implemented: true },
  { label: 'ResourcePool',             implemented: true },
];

export function Enterprise() {
  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Enterprise (EAT-v0)</h1>
        <p className="text-sm text-ink-300 mt-1">
          Corporate identity containers — multi-machine providers
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-forge-500/10 border border-forge-500/30">
        <Building2 size={16} className="text-forge-400 shrink-0 mt-0.5" />
        <p className="text-sm text-forge-300">
          Phase 0 defined, Phase 1 activated. EnterpriseId struct and{' '}
          <span className="font-mono">ProviderOwner::Enterprise</span> variant are in the codebase.
        </p>
      </div>

      {/* Two cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* EAT Components checklist */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink-100 uppercase tracking-wider">EAT Components</h2>
          <div className="space-y-2">
            {EAT_COMPONENTS.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <CheckCircle2 size={14} className="text-success-400 shrink-0" />
                <span className="font-mono text-xs text-ink-200">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accountability Rule */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-100 uppercase tracking-wider">Accountability Rule</h2>
          <p className="text-sm text-ink-300">
            An Enterprise entity takes full chain accountability for every MachineID registered under its{' '}
            <span className="font-mono text-xs text-forge-400">EnterpriseId</span>. Attestation keys and
            capability descriptors are bound to the enterprise controller and cannot be transferred without
            an on-chain governance action.
          </p>
          <p className="text-xs text-ink-400">
            Individual machines within an enterprise inherit the enterprise's sybil score and reputation
            weight for contribution-track eligibility.
          </p>
        </div>
      </div>

      {/* Coming-soon panel */}
      <div className="rounded-xl border-2 border-dashed border-forge-500/30 p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-forge-500/10 border border-forge-500/20 flex items-center justify-center">
          <Building2 size={22} className="text-forge-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-200">Enterprise Registry — Pending Backend</p>
          <p className="text-xs text-ink-400 mt-1">
            Enterprise entity lookup and registration will be available once the EAT backend endpoint is live.
          </p>
        </div>
        <code className="text-xs font-mono text-forge-400 bg-forge-500/10 px-3 py-1.5 rounded-lg border border-forge-500/20">
          /api/enterprise
        </code>
      </div>
    </div>
  );
}
