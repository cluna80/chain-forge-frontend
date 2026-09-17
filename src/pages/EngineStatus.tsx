import { ENGINE_LAYERS, ENGINE_VERSION } from '@/lib/engineData';
import { Cpu, Network, Database, Layers, CheckCircle2, AlertTriangle, CircleDashed } from 'lucide-react';

const LAYER_ICONS: Record<string, typeof Cpu> = {
  consensus: Cpu,
  p2p: Network,
  execution: Layers,
  state: Database,
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  implemented: { className: 'badge-implemented', label: 'Implemented' },
  partial: { className: 'badge-partial', label: 'Partial' },
  stubbed: { className: 'badge-stubbed', label: 'Stubbed' },
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  implemented: CheckCircle2,
  partial: AlertTriangle,
  stubbed: CircleDashed,
};

export function EngineStatus() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Engine Status</h1>
        <p className="text-sm text-ink-300 mt-1">
          The Chain Forge Rust engine is built in stages. Here's what's working and what's coming.
        </p>
      </div>

      {/* Version banner */}
      <div className="card p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-forge-500 to-violet-600 flex items-center justify-center shadow-lg shadow-forge-700/20">
          <Cpu size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-white">Chain Forge Engine</h2>
          <p className="text-xs text-ink-400 font-mono">v{ENGINE_VERSION} — built in Rust</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-implemented">2 Implemented</span>
          <span className="badge badge-partial">2 Partial</span>
          <span className="badge badge-stubbed">0 Stubbed</span>
        </div>
      </div>

      {/* Layer cards */}
      <div className="grid gap-4">
        {ENGINE_LAYERS.map((layer) => {
          const Icon = LAYER_ICONS[layer.id] ?? Cpu;
          const StatusIcon = STATUS_ICON[layer.status] ?? CircleDashed;
          const badge = STATUS_BADGE[layer.status];
          const implementedCount = layer.details.filter((d) => d.includes('implemented')).length;
          const stubbedCount = layer.details.filter((d) => d.includes('stubbed')).length;

          return (
            <div key={layer.id} className="card p-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  layer.status === 'implemented' ? 'bg-success-500/10 border border-success-500/20' :
                  layer.status === 'partial' ? 'bg-warn-500/10 border border-warn-500/20' :
                  'bg-ink-750 border border-ink-600'
                }`}>
                  <Icon size={22} className={
                    layer.status === 'implemented' ? 'text-success-400' :
                    layer.status === 'partial' ? 'text-warn-400' :
                    'text-ink-400'
                  } />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-white">{layer.name}</h3>
                    <span className={`badge ${badge.className}`}>
                      <StatusIcon size={12} />
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-ink-300 mb-4">{layer.description}</p>

                  <div className="space-y-1.5">
                    {layer.details.map((detail, i) => {
                      const isStubbed = detail.includes('stubbed');
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {isStubbed ? (
                            <span className="text-xs text-ink-400 font-mono">[stub]</span>
                          ) : (
                            <span className="text-xs text-success-400 font-mono">[ok]</span>
                          )}
                          <span className={isStubbed ? 'text-ink-400' : 'text-ink-200'}>
                            {detail.replace(' — implemented', '').replace(' — stubbed (coming soon)', '')}
                          </span>
                          {isStubbed && (
                            <span className="text-[10px] text-ink-500 italic">coming soon</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 mt-4 pt-3 border-t border-ink-700/50 text-xs text-ink-400 font-mono">
                    <span>{implementedCount} implemented</span>
                    <span>{stubbedCount} coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5 mt-6 border-warn-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-warn-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-ink-200 font-medium">Genesis generation is not yet live</p>
            <p className="text-xs text-ink-400 mt-1">
              The "Generate Genesis" button in the wizard will save your chain configuration but the
              Rust build API is still being wired up. Your configs are stored safely — once the engine
              build endpoint is online, saved chains can be compiled without re-entering anything.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
