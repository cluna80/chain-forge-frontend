import { Server } from 'lucide-react';

export function Machines() {
  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Machines</h1>
        <p className="text-sm text-ink-300 mt-1">
          MachineID registry — every provider's hardware tracked on-chain
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* ProviderOwner */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-100 uppercase tracking-wider">ProviderOwner</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-forge-400 shrink-0 mt-0.5">Individual</span>
              <span className="text-xs text-ink-400">(SponsorId) — a single human provider verified through the identity layer</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-forge-400 shrink-0 mt-0.5">Enterprise</span>
              <span className="text-xs text-ink-400">(EnterpriseId) — a corporate entity registered via the EAT-v0 framework</span>
            </div>
          </div>
        </div>

        {/* MachineMode */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-100 uppercase tracking-wider">MachineMode</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-forge-400 shrink-0 mt-0.5">MarketplaceOnly</span>
              <span className="text-xs text-ink-400">accepts paid resource jobs only</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-forge-400 shrink-0 mt-0.5">ContributionOnly</span>
              <span className="text-xs text-ink-400">donates compute for uQCB epoch rewards</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-forge-400 shrink-0 mt-0.5">Both</span>
              <span className="text-xs text-ink-400">participates in both tracks simultaneously</span>
            </div>
          </div>
        </div>
      </div>

      {/* MachineRecord struct shape */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink-100">MachineRecord Struct</h2>
        <pre className="text-xs font-mono text-forge-300 bg-ink-900/60 rounded-lg p-4 border border-ink-700/50 overflow-x-auto">
{`machine_id, provider_id, owner: ProviderOwner, attestation_key, capability_descriptor, status, mode`}
        </pre>
      </div>

      {/* Coming-soon panel */}
      <div className="rounded-xl border-2 border-dashed border-forge-500/30 p-8 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-forge-500/10 border border-forge-500/20 flex items-center justify-center">
          <Server size={22} className="text-forge-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-200">Machine Registry — Pending Backend</p>
          <p className="text-xs text-ink-400 mt-1">
            The MachineID registry will be queryable once the resource market backend is live.
          </p>
        </div>
        <code className="text-xs font-mono text-forge-400 bg-forge-500/10 px-3 py-1.5 rounded-lg border border-forge-500/20">
          /api/machines
        </code>
      </div>
    </div>
  );
}
