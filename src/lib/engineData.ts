import type { EngineLayer, EngineModule } from '@/types';

// ENGINE_VERSION tracks the Chain Forge *frontend/spec* version. Bump this only
// when the wizard/schema changes.
export const ENGINE_VERSION = '0.1.0';

// The local Chain Forge service (chain-forge-service) that turns a genesis
// into a running chain on this machine. It only accepts requests from the
// wizard's own origin (default http://localhost:5173).
export const SERVICE_URL = 'http://127.0.0.1:7700';

// Engine status, verified against the Rust code. Rule, unchanged: nothing is
// listed as done unless real Rust code backs it, and anything the wizard
// records but the engine does not act on says so plainly.
export const ENGINE_LAYERS: EngineLayer[] = [
  {
    id: 'consensus',
    name: 'Consensus',
    description: 'Block proposal, voting, and finality',
    status: 'partial',
    version: '0.1.0',
    details: [
      'Tendermint-style BFT (propose / prevote / precommit) — implemented, proven live on 4 validators',
      'Proposer rotation, round timeouts, locked-block safety — implemented',
      'Personhood-weighted power cap — implemented (opt-in, requires identity)',
      'Signatures on proposals and votes — NOT implemented: fields exist but are empty and unchecked',
      'Proof of Authority — not distinct yet: runs the same BFT engine as PoS',
      'Slashing — logic exists (chain-forge-slashing) but the node does not use it yet',
      'Light client verification — not started',
    ],
  },
  {
    id: 'p2p',
    name: 'P2P Networking',
    description: 'Peer discovery, gossip, and block propagation',
    status: 'partial',
    version: '0.1.0',
    details: [
      'libp2p transport with bootstrap peering — implemented',
      'Gossipsub for blocks, votes and transactions — implemented',
      'State sync for a node that falls behind — implemented',
      'mDNS / bootstrap discovery setting — implemented',
      'Peer scoring — basic implementation',
      'NAT traversal / relay — not started',
    ],
  },
  {
    id: 'execution',
    name: 'Execution Engine',
    description: 'Transaction dispatch and state transitions',
    status: 'partial',
    version: '0.1.0',
    details: [
      'Sequential transaction execution — implemented',
      'Ed25519 transaction signatures with per-account key binding — implemented',
      'Module gating (genesis decides which transaction types exist) — implemented',
      'Gas metering: fixed, dynamic and EIP-1559-style calculation — implemented',
      'Parallel execution — not started (setting is recorded, not used)',
      'UTXO and hybrid state models — not started (account model only)',
      'Post-quantum transaction signatures — not started (setting is recorded, not used)',
    ],
  },
  {
    id: 'state',
    name: 'State Storage',
    description: 'Merkleized state tree and snapshots',
    status: 'partial',
    version: '0.1.0',
    details: [
      'Merkle state tree with deterministic state roots — implemented',
      'In-memory snapshots — implemented',
      'Persistence to disk — implemented: state.json / identity.json / cirfi.json written after every committed block; --data-dir restores on restart',
      'Historical state queries — not started',
      'State pruning — not started',
    ],
  },
];

// Exactly the modules the engine knows (chain-forge-core KNOWN_MODULES).
// The engine refuses a genesis that names anything else, so the wizard
// offers nothing else. Keep these two lists in sync.
export const ENGINE_MODULES: EngineModule[] = [
  {
    id: 'bank',
    name: 'Bank',
    description: 'Accounts, transfers and burns. Every chain has this.',
    category: 'Core',
    available: true,
    required: true,
  },
  {
    id: 'staking',
    name: 'Staking',
    description: 'Stake transactions toward validators.',
    category: 'Core',
    available: true,
  },
  {
    id: 'identity',
    name: 'Identity (Proof of Personhood)',
    description: 'Human registration and web-of-trust attestation: 3 verified people vouch for a newcomer.',
    category: 'Personhood',
    available: true,
  },
  {
    id: 'cirfi',
    name: 'CirFi UBI',
    description: 'Universal basic income claims and the UBI pool, paid only to verified humans.',
    category: 'Personhood',
    available: true,
    requires: ['identity'],
  },
  {
    id: 'agents',
    name: 'Sponsored Agents',
    description: 'Software agents that act for a verified human sponsor.',
    category: 'Personhood',
    available: true,
    requires: ['identity'],
  },
];

// Every step is usable, including Generate: the local service can now run
// the chain on this machine.
export function getLayerStatusForWizardStep(_stepId: string): 'ready' | 'coming-soon' {
  return 'ready';
}