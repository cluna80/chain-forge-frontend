import { useState } from 'react';
import { Zap, ShieldAlert, AlertTriangle } from 'lucide-react';

type Tab = 'modes' | 'score' | 'farming';

const TABS: { id: Tab; label: string }[] = [
  { id: 'modes',   label: 'Machine Modes' },
  { id: 'score',   label: 'Contribution Score' },
  { id: 'farming', label: 'Anti-Farming' },
];

const MACHINE_MODES = [
  {
    label: 'MarketplaceOnly',
    description:
      'The machine accepts paid resource jobs from consumers. Earnings are in QRC tokens settled on-chain via ResourceExecutionReceipt.',
  },
  {
    label: 'ContributionOnly',
    description:
      'The machine donates compute to the network contribution pool. No direct payment per job — rewards come as uQCB at epoch close.',
  },
  {
    label: 'Both',
    description:
      'The machine participates in paid marketplace jobs and the contribution pool simultaneously. Contribution score is calculated only from contribution-track work.',
  },
];

const ANTI_FARMING: string[] = [
  'SponsorID gate',
  'MachineID uniqueness',
  'Execution receipts not heartbeats',
  'Self-dealing detection',
  'Consumer diversity',
  'Resource proofs',
  'Reliability scoring',
  'Integrity scoring',
  'Contribution score threshold gate',
];

export function Contribution() {
  const [tab, setTab] = useState<Tab>('modes');

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dual Mode &amp; Contribution</h1>
        <p className="text-sm text-ink-300 mt-1">
          Machines doing useful network work earn uQCB epoch rewards
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warn-500/10 border border-warn-500/30">
        <AlertTriangle size={16} className="text-warn-400 shrink-0 mt-0.5" />
        <p className="text-sm text-warn-300">
          All 9 anti-farming defenses must ship before uQCB distribution goes live
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-ink-850/60 rounded-xl border border-ink-700/40">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-ink-700 text-ink-50 shadow-sm'
                : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Machine Modes */}
      {tab === 'modes' && (
        <div className="grid gap-4">
          {MACHINE_MODES.map((mode) => (
            <div key={mode.label} className="card p-5 space-y-2">
              <span className="font-mono text-sm text-forge-400 font-semibold">{mode.label}</span>
              <p className="text-sm text-ink-300">{mode.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Contribution Score */}
      {tab === 'score' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink-100">Score Formula Concept</h2>
            <p className="text-sm text-ink-300">
              Each machine's contribution score is derived from the volume and quality of verified execution
              receipts submitted during an epoch. Factors include resource proof validity, consumer diversity,
              and absence of self-dealing patterns. Higher scores yield a proportionally larger share of
              the epoch's uQCB distribution.
            </p>
            <pre className="text-xs font-mono text-forge-300 bg-ink-900/60 rounded-lg p-4 border border-ink-700/50">
{`score = Σ(verified_receipts × weight) × diversity_multiplier × reliability_factor`}
            </pre>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-teal-500/10 border border-teal-500/30">
            <Zap size={16} className="text-teal-400 shrink-0 mt-0.5" />
            <p className="text-sm text-teal-300">
              uQCB comes from a fixed predefined pool — not newly minted QRC
            </p>
          </div>
        </div>
      )}

      {/* Anti-Farming */}
      {tab === 'farming' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-start gap-3 mb-1">
            <ShieldAlert size={18} className="text-warn-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-ink-100">Anti-Farming Defenses</h2>
              <p className="text-xs text-ink-400 mt-0.5">All 9 must be implemented before rewards go live</p>
            </div>
          </div>
          <div className="space-y-2">
            {ANTI_FARMING.map((defense, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-ink-700/40 last:border-0">
                <span className="text-ink-500 text-sm font-mono shrink-0">□</span>
                <span className="text-xs font-mono text-ink-500 w-5 shrink-0">{i + 1}.</span>
                <span className="text-sm text-ink-300">{defense}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
