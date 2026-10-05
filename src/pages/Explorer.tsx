import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Wifi, WifiOff,
  Users, Layers, ShieldCheck, Zap,
  ChevronRight, AlertCircle,
} from 'lucide-react';
import {
  DEFAULT_NODE_URL,
  fetchStatus, fetchAccounts, fetchBlocks, fetchValidators, fetchQrc,
  fetchIdentity,
  type NodeStatus, type AccountEntry, type BlockSummary,
  type ValidatorEntry, type QrcMetrics, type IdentityTier,
} from '@/lib/nodeApi';

type Tab = 'accounts' | 'blocks' | 'validators' | 'qrc';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'accounts',   label: 'Accounts',   icon: Users },
  { id: 'blocks',     label: 'Blocks',     icon: Layers },
  { id: 'validators', label: 'Validators', icon: ShieldCheck },
  { id: 'qrc',        label: 'QRC Pool',   icon: Zap },
];

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 rounded-full border-2 border-forge-500 border-t-transparent animate-spin" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm">
      <AlertCircle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Sub-panels ─────────────────────────────────────────────────────────────

function AccountsPanel({ base }: { base: string }) {
  const [data, setData] = useState<AccountEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AccountEntry | null>(null);
  const [identity, setIdentity] = useState<IdentityTier | null>(null);
  const [idLoading, setIdLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAccounts(base)
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [base]);

  const loadIdentity = async (addr: string) => {
    setIdLoading(true);
    setIdentity(null);
    try {
      const id = await fetchIdentity(base, addr);
      setIdentity(id);
    } catch {
      /* identity endpoint may not exist for every address */
    } finally {
      setIdLoading(false);
    }
  };

  const filtered = (data ?? []).filter(
    (a) => !search || a.address.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <Spinner />;
  if (err) return <ErrorBox message={err} />;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          className="input-field pl-9"
          placeholder="Search by address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="divide-y divide-ink-700/50">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-ink-400 text-sm">No accounts found.</p>
        )}
        {filtered.map((acct) => (
          <button
            key={acct.address}
            onClick={() => {
              setSelected(acct);
              loadIdentity(acct.address);
            }}
            className="w-full flex items-center justify-between py-3 hover:bg-ink-800/40 transition-colors px-2 rounded-lg text-left"
          >
            <div>
              <p className="font-mono text-xs text-ink-100">{acct.address}</p>
              <p className="text-xs text-ink-400 mt-0.5">
                {Object.entries(acct.balances)
                  .map(([d, v]) => `${v} ${d}`)
                  .join(' · ')}{' '}
                · nonce {acct.nonce}
                {acct.role && ` · ${acct.role}`}
              </p>
            </div>
            <ChevronRight size={14} className="text-ink-500 shrink-0 ml-3" />
          </button>
        ))}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-100">Account Detail</h3>
            <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-white text-xs">
              ✕ close
            </button>
          </div>
          <div className="space-y-2">
            <Row label="Address" value={selected.address} mono />
            <Row label="Nonce"   value={String(selected.nonce)} />
            {selected.role && <Row label="Role" value={selected.role} />}
            {Object.entries(selected.balances).map(([d, v]) => (
              <Row key={d} label={`Balance (${d})`} value={v} />
            ))}
          </div>

          {idLoading && <div className="h-1 bg-forge-500/30 rounded animate-pulse-soft" />}
          {identity && (
            <div className="border-t border-ink-700/50 pt-3 space-y-2">
              <p className="text-xs font-medium text-ink-300 uppercase tracking-wider">Identity</p>
              <Row label="Tier"         value={identity.tier} />
              <Row label="Sybil flags"  value={String(identity.sybil_flags)} />
              <Row label="Attesters"    value={identity.attesters.length ? identity.attesters.join(', ') : 'none'} mono />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BlocksPanel({ base }: { base: string }) {
  const [data, setData] = useState<BlockSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBlocks(base)
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [base]);

  if (loading) return <Spinner />;
  if (err) return <ErrorBox message={err} />;
  const blocks = data ?? [];

  return (
    <div className="divide-y divide-ink-700/50">
      {blocks.length === 0 && (
        <p className="py-8 text-center text-ink-400 text-sm">No blocks yet.</p>
      )}
      {blocks.map((b) => (
        <div key={b.hash} className="py-3 px-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-forge-400">Block #{b.height}</span>
            <span className="text-xs text-ink-400">{b.tx_count} tx</span>
          </div>
          <p className="font-mono text-[11px] text-ink-300 truncate">{b.hash}</p>
          {b.proposer && (
            <p className="font-mono text-[11px] text-ink-500 truncate">by {b.proposer}</p>
          )}
          <p className="text-[11px] text-ink-500">{new Date(b.timestamp).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function ValidatorsPanel({ base }: { base: string }) {
  const [data, setData] = useState<ValidatorEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchValidators(base)
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [base]);

  if (loading) return <Spinner />;
  if (err) return <ErrorBox message={err} />;
  const vals = data ?? [];

  return (
    <div className="divide-y divide-ink-700/50">
      {vals.length === 0 && (
        <p className="py-8 text-center text-ink-400 text-sm">No validators found.</p>
      )}
      {vals.map((v, i) => (
        <div key={v.address} className="py-3 px-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 w-4">{i + 1}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  v.status === 'active' ? 'bg-success-400' : 'bg-ink-500'
                }`}
              />
              <p className="font-mono text-xs text-ink-100">{v.address}</p>
            </div>
            <span className="text-xs text-ink-300">{v.voting_power} VP</span>
          </div>
          <div className="ml-6 flex gap-3 text-[11px] text-ink-500">
            <span>Status: {v.status}</span>
            {v.commission && <span>Commission: {v.commission}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function QrcPanel({ base }: { base: string }) {
  const [data, setData] = useState<QrcMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchQrc(base)
      .then(setData)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [base]);

  if (loading) return <Spinner />;
  if (err) return <ErrorBox message={err} />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Total Supply" value={data.total_supply} unit="QRC" />
        <MetricTile label="Circulating"  value={data.circulating}  unit="QRC" />
        {data.pool_qcb  && <MetricTile label="Pool QCB"  value={data.pool_qcb}  unit="QCB" />}
        {data.pool_qrc  && <MetricTile label="Pool QRC"  value={data.pool_qrc}  unit="QRC" />}
        {data.price_qcb && <MetricTile label="Price"     value={data.price_qcb} unit="QCB/QRC" />}
      </div>
    </div>
  );
}

// ── Shared micro-components ─────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-ink-400 shrink-0">{label}</span>
      <span className={`text-ink-100 text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="card p-4 space-y-1">
      <p className="text-[11px] text-ink-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-ink-50 font-mono">{value}</p>
      <p className="text-[11px] text-ink-500">{unit}</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function Explorer() {
  const [nodeUrl, setNodeUrl] = useState(DEFAULT_NODE_URL);
  const [draftUrl, setDraftUrl] = useState(DEFAULT_NODE_URL);
  const [tab, setTab] = useState<Tab>('accounts');
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const pingStatus = useCallback(() => {
    setStatusErr(null);
    fetchStatus(nodeUrl)
      .then(setStatus)
      .catch((e: Error) => {
        setStatus(null);
        setStatusErr(e.message);
      });
  }, [nodeUrl]);

  useEffect(() => { pingStatus(); }, [pingStatus, refreshKey]);

  const connected = status !== null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-ink-50">Chain Explorer</h1>
        <p className="text-sm text-ink-400 mt-0.5">Browse live state from a running node</p>
      </div>

      {/* Node connection bar */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="label text-[11px] uppercase tracking-wider">Node RPC URL</label>
            <div className="flex gap-2">
              <input
                className="input-mono flex-1 text-xs"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setNodeUrl(draftUrl);
                    setRefreshKey((k) => k + 1);
                  }
                }}
                placeholder="http://localhost:8080"
              />
              <button
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => {
                  setNodeUrl(draftUrl);
                  setRefreshKey((k) => k + 1);
                }}
              >
                Connect
              </button>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="btn-ghost p-2 mt-5"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Status strip */}
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
          connected
            ? 'bg-success-500/10 border border-success-500/20 text-success-400'
            : 'bg-danger-500/10 border border-danger-500/20 text-danger-400'
        }`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? (
            <span>
              Connected · chain <span className="font-mono">{status!.chain_id}</span> ·
              height <span className="font-mono">{status!.height}</span> ·
              peers {status!.peers}
              {status!.is_validator && ' · validator'}
            </span>
          ) : (
            <span>Not connected{statusErr ? ` — ${statusErr}` : ''}</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-ink-850/60 rounded-xl border border-ink-700/40">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-ink-700 text-ink-50 shadow-sm'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="card p-5">
        {tab === 'accounts'   && <AccountsPanel   key={`acc-${nodeUrl}-${refreshKey}`}   base={nodeUrl} />}
        {tab === 'blocks'     && <BlocksPanel     key={`blk-${nodeUrl}-${refreshKey}`}   base={nodeUrl} />}
        {tab === 'validators' && <ValidatorsPanel key={`val-${nodeUrl}-${refreshKey}`}   base={nodeUrl} />}
        {tab === 'qrc'        && <QrcPanel        key={`qrc-${nodeUrl}-${refreshKey}`}   base={nodeUrl} />}
      </div>
    </div>
  );
}
