import { useState } from 'react';
import { Trophy, FlaskConical, AlertTriangle } from 'lucide-react';

type Tab = 'tracks' | 'pud' | 'dashboard';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tracks',    label: 'Research Tracks' },
  { id: 'pud',       label: 'Proof of Useful Discovery' },
  { id: 'dashboard', label: 'Discovery Dashboard' },
];

const RESEARCH_TRACKS = [
  {
    label: 'Post-Quantum Crypto',
    description:
      'Design and verify cryptographic primitives that remain secure against quantum adversaries. Candidates feed into the QCB signature and key-encapsulation modules.',
  },
  {
    label: 'Computational Efficiency',
    description:
      'Discover algorithms or circuit optimizations that reduce the computational cost of on-chain verification, consensus, or zero-knowledge proof generation.',
  },
  {
    label: 'Verifiable Mathematics',
    description:
      'Produce formally verified proofs of mathematical theorems that underpin blockchain security properties or distributed-systems correctness arguments.',
  },
  {
    label: 'AI-Assisted Discovery',
    description:
      'Use AI agents running on QCB machines to accelerate research in any of the above tracks. Discoveries must still pass human and algorithmic verification gates.',
  },
  {
    label: 'Open Research Reserve',
    description:
      'A flex track for breakthrough research that doesn't fit the other categories. The QCB governance committee reviews and categorizes accepted submissions.',
  },
];

const PUD_REQUIREMENTS = [
  'Submission must reference a specific Research Track',
  'Discovery must be reproducible by an independent verifier machine',
  'Proof artifact must be hash-committed to the submission transaction',
  'Submitting machine must have a valid MachineID with active attestation',
  'SponsorID or EnterpriseId must be linked to the machine at submission time',
  'Discovery must not duplicate an already-accepted submission (dedup hash check)',
  'Human reviewer quorum must ratify before on-chain acceptance',
  'Hard safety boundary: accepted discoveries never automatically change QCB protocol',
];

const METRIC_TILES = [
  { label: 'Active Challenges' },
  { label: 'Machines Contributing' },
  { label: 'Discoveries Accepted' },
];

export function GrandChallenge() {
  const [tab, setTab] = useState<Tab>('tracks');

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">QCB Grand Challenge</h1>
        <p className="text-sm text-ink-300 mt-1">
          Long-term distributed research compute
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warn-500/10 border border-warn-500/30">
        <AlertTriangle size={16} className="text-warn-400 shrink-0 mt-0.5" />
        <p className="text-sm text-warn-300">
          Hard safety boundary: discoveries never automatically change QCB protocol
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

      {/* Research Tracks */}
      {tab === 'tracks' && (
        <div className="grid gap-4">
          {RESEARCH_TRACKS.map((track) => (
            <div key={track.label} className="card p-5 space-y-2">
              <div className="flex items-center gap-2">
                <FlaskConical size={15} className="text-forge-400 shrink-0" />
                <span className="text-sm font-semibold text-ink-100">{track.label}</span>
              </div>
              <p className="text-sm text-ink-300 pl-6">{track.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Proof of Useful Discovery */}
      {tab === 'pud' && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink-100">PUD Requirements</h2>
          <div className="space-y-2">
            {PUD_REQUIREMENTS.map((req, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-ink-700/40 last:border-0">
                <span className="text-ink-500 text-sm font-mono shrink-0 mt-0.5">□</span>
                <span className="text-xs font-mono text-ink-500 w-5 shrink-0 mt-0.5">{i + 1}.</span>
                <span className="text-sm text-ink-300">{req}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Dashboard */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {METRIC_TILES.map((tile) => (
              <div key={tile.label} className="card p-4 space-y-1">
                <p className="text-[11px] text-ink-400 uppercase tracking-wider">{tile.label}</p>
                <p className="text-2xl font-semibold text-ink-50 font-mono">—</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border-2 border-dashed border-forge-500/30 p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-forge-500/10 border border-forge-500/20 flex items-center justify-center">
              <Trophy size={22} className="text-forge-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-200">Discovery Dashboard — Pending Backend</p>
              <p className="text-xs text-ink-400 mt-1">
                Live challenge and discovery data will populate once the Grand Challenge backend is wired up.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
