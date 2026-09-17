import type { EngineLayer, EngineModule } from '@/types';

// ENGINE_VERSION tracks the Chain Forge *frontend/spec* version, not proof that
// any Rust engine code exists yet. Bump this only when the wizard/schema changes.
export const ENGINE_VERSION = '0.1.0';

// Honest baseline: as of this writing, no Rust engine code has been written.
// Every layer below is a planned roadmap item, not a progress report.
// Do NOT mark anything 'implemented' or 'partial' here until real Rust code
// backs that claim — this file previously had fabricated "implemented" status
// for consensus/P2P/execution/state that did not reflect reality.
export const ENGINE_LAYERS: EngineLayer[] = [
  {
    id: 'consensus',
    name: 'Consensus',
    description: 'Block proposal, voting, and finality',
    status: 'stubbed',
    version: '0.0.0',
    details: [
      'Custom PoS validator selection — not started',
      'PoA authority set — not started',
      'Block proposal & voting — not started',
      'Slashing logic — not started',
      'Light client verification — not started',
    ],
  },
  {
    id: 'p2p',
    name: 'P2P Networking',
    description: 'Peer discovery, gossip, and block propagation',
    status: 'stubbed',
    version: '0.0.0',
    details: [
      'Libp2p transport — not started',
      'Peer discovery (mDNS/bootstrap) — not started',
      'Gossipsub for block/tx propagation — not started',
      'NAT traversal / relay — not started',
      'Peer scoring & reputation — not started',
    ],
  },
  {
    id: 'execution',
    name: 'Execution Engine',
    description: 'Transaction dispatch and state transitions',
    status: 'stubbed',
    version: '0.0.0',
    details: [
      'Sequential transaction execution — not started',
      'Parallel execution scheduler — not started',
      'Gas metering (fixed & dynamic) — not started',
      'EIP-1559-style fee market — not started',
      'State access patterns (account model) — not started',
      'UTXO model support — not started',
    ],
  },
  {
    id: 'state',
    name: 'State Storage',
    description: 'Merkleized state tree and snapshots',
    status: 'stubbed',
    version: '0.0.0',
    details: [
      'JMT (Jellyfish Merkle Tree) — not started',
      'State snapshots — not started',
      'Historical state queries — not started',
      'State pruning — not started',
    ],
  },
];

// `available: true` here means "planned to be selectable in the wizard" —
// it does NOT mean the module is implemented in the Rust engine yet. Actual
// build/implementation status lives only in ENGINE_LAYERS above and on the
// Engine Status page, which currently shows everything as not started.
export const ENGINE_MODULES: EngineModule[] = [
  {
    id: 'staking',
    name: 'Staking',
    description: 'Delegate, undelegate, claim rewards, validator bonding',
    category: 'Consensus',
    available: true,
  },
  {
    id: 'governance',
    name: 'Governance',
    description: 'Proposal submission, voting, parameter changes',
    category: 'Governance',
    available: true,
  },
  {
    id: 'bank',
    name: 'Bank',
    description: 'Token transfers, balance tracking, multi-send',
    category: 'Core',
    available: true,
  },
  {
    id: 'slashing',
    name: 'Slashing',
    description: 'Validator punishment for downtime / double-signing',
    category: 'Consensus',
    available: false,
  },
  {
    id: 'distribution',
    name: 'Distribution',
    description: 'Reward distribution to validators and delegators',
    category: 'Core',
    available: true,
  },
  {
    id: 'ibc',
    name: 'IBC Relayer',
    description: 'Inter-blockchain communication protocol',
    category: 'Interop',
    available: false,
  },
  {
    id: 'wasm',
    name: 'CosmWasm VM',
    description: 'Smart contract execution via WebAssembly',
    category: 'Execution',
    available: false,
  },
  {
    id: 'upgrade',
    name: 'Upgrade Scheduler',
    description: 'On-chain coordinated protocol upgrades',
    category: 'Governance',
    available: true,
  },
  {
    id: 'evidence',
    name: 'Evidence',
    description: 'Evidence handling for misbehavior reporting',
    category: 'Consensus',
    available: false,
  },
  {
    id: 'feegrant',
    name: 'Fee Grant',
    description: 'Allow one account to pay fees for another',
    category: 'Core',
    available: true,
  },
];

// Every configuration step is usable now — they collect intent into the
// genesis config. Only the actual build/compile step ('generate') is blocked
// on the Rust engine existing. Do NOT mark config steps 'coming-soon' just
// because their backend layer isn't built yet; that's what Engine Status is for.
export function getLayerStatusForWizardStep(stepId: string): 'ready' | 'coming-soon' {
  switch (stepId) {
    case 'basics':
    case 'environment':
    case 'consensus':
    case 'execution':
    case 'modules':
    case 'cryptography':
    case 'network':
    case 'limits':
    case 'accounts':
      return 'ready';
    case 'generate':
      return 'coming-soon';
    default:
      return 'coming-soon';
  }
}