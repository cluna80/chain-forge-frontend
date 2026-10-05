/**
 * Chain Forge Node API
 * Thin fetch helpers for the node's RPC port (default :8080).
 * The node always responds with Access-Control-Allow-Origin: *.
 */

export const DEFAULT_NODE_URL = 'http://localhost:8080';

async function get<T>(base: string, path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(base: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Explorer endpoints ──────────────────────────────────────────────────────

export interface NodeStatus {
  node_id: string;
  chain_id: string;
  height: number;
  peers: number;
  is_validator: boolean;
  uptime_secs?: number;
}

export interface AccountEntry {
  address: string;
  balances: Record<string, string>;
  nonce: number;
  role?: string;
}

export interface BlockSummary {
  height: number;
  hash: string;
  timestamp: string;
  tx_count: number;
  proposer?: string;
}

export interface ValidatorEntry {
  address: string;
  voting_power: string;
  status: string;
  commission?: string;
}

export interface QrcMetrics {
  total_supply: string;
  circulating: string;
  price_qcb?: string;
  pool_qcb?: string;
  pool_qrc?: string;
}

export interface IdentityTier {
  address: string;
  tier: string;
  attesters: string[];
  sybil_flags: number;
}

export function fetchStatus(base: string) {
  return get<NodeStatus>(base, '/api/status');
}

export function fetchAccounts(base: string) {
  return get<AccountEntry[]>(base, '/api/accounts');
}

export function fetchAccount(base: string, address: string) {
  return get<AccountEntry>(base, `/api/accounts/${address}`);
}

export function fetchBlocks(base: string) {
  return get<BlockSummary[]>(base, '/api/blocks');
}

export function fetchValidators(base: string) {
  return get<ValidatorEntry[]>(base, '/api/validators');
}

export function fetchQrc(base: string) {
  return get<QrcMetrics>(base, '/api/qrc');
}

export function fetchIdentity(base: string, address: string) {
  return get<IdentityTier>(base, `/api/identity/${address}`);
}

// ── Tx Builder endpoint ─────────────────────────────────────────────────────
//
// The node's POST /api/tx expects a fully-formed Transaction struct:
//   { id, sender, nonce, body, gas_limit, signature?, public_key? }
//
// Numeric fields (amount, units, etc.) must be JSON numbers, not strings.
// The node runs in no-signature mode for devnet (require_signatures: false),
// so signature and public_key can be omitted.

export type TxBody =
  | { Transfer:             { to: string; denom: string; amount: number } }
  | { Burn:                 { denom: string; amount: number } }
  | { Stake:                { validator: string; amount: number } }
  | { QrcPurchase:          { qcb_amount: number; min_qrc_out: number } }
  | { QrcSpend:             { resource: string; units: number; amount: number } }
  | { RegisterIdentity:     Record<string, never> }
  | { Attest:               { claimant_id: string } }
  | { RevokeAttestation:    { attested_id: string } }
  | { ReportSuspectedSybil: { suspected_id: string } }
  | { ConfirmSybil:         { sybil_id: string } }
  | { ReverseSybil:         { sybil_id: string } }
  | { SponsorAgent:         { agent_address: string } }
  | { RevokeAgent:          { agent_address: string } }
  | { RevokeAgentFull:      { agent_id: string } }
  | { AuthorizeAgent:       { agent_id: string } }
  | { SuspendAgent:         { agent_id: string; reason: string } }
  | { Custom:               { module: string; payload: string } };

/** Full Transaction struct as expected by POST /api/tx */
export interface Transaction {
  id: string;
  sender: string;
  nonce: number;
  body: TxBody;
  gas_limit: number;
  signature?: number[];
  public_key?: number[];
}

export interface TxResponse {
  /** "queued" on success */
  status: string;
  tx_id: string;
}

/** Monotonically increasing counter used to generate unique tx IDs client-side. */
let _txSeq = 0;

/**
 * Build and submit a transaction.
 * Generates a deterministic-enough ID from sender + nonce + timestamp.
 * The node re-hashes the tx itself; this ID is just used for correlation.
 */
export function submitTx(
  base: string,
  sender: string,
  nonce: number,
  body: TxBody,
  gasLimit = 200_000,
) {
  const id = `tx-${sender}-${nonce}-${Date.now()}-${++_txSeq}`;
  const tx: Transaction = { id, sender, nonce, body, gas_limit: gasLimit };
  return post<TxResponse>(base, '/api/tx', tx);
}
