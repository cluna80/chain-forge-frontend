import { useState } from 'react';
import {
  Send, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { DEFAULT_NODE_URL, submitTx, type TxBody } from '@/lib/nodeApi';

// ── Tx variant definitions ──────────────────────────────────────────────────

type FieldDef = { name: string; label: string; placeholder?: string; mono?: boolean; numeric?: boolean };

interface VariantDef {
  key: string;
  label: string;
  category: string;
  fields: FieldDef[];
  description?: string;
}

const VARIANTS: VariantDef[] = [
  // Token
  {
    key: 'Transfer', label: 'Transfer', category: 'Token',
    description: 'Send tokens from your account to another address.',
    fields: [
      { name: 'to',     label: 'To Address',  placeholder: 'qcb1…', mono: true },
      { name: 'denom',  label: 'Denom',        placeholder: 'uqcb' },
      { name: 'amount', label: 'Amount (uqcb)', placeholder: '1000000', numeric: true },
    ],
  },
  {
    key: 'Burn', label: 'Burn', category: 'Token',
    description: 'Permanently burn tokens, reducing the supply.',
    fields: [
      { name: 'denom',  label: 'Denom',        placeholder: 'uqcb' },
      { name: 'amount', label: 'Amount (uqcb)', placeholder: '1000000', numeric: true },
    ],
  },
  // Staking
  {
    key: 'Stake', label: 'Stake', category: 'Staking',
    description: 'Delegate QCB to a validator.',
    fields: [
      { name: 'validator', label: 'Validator Address', placeholder: 'qcb1…', mono: true },
      { name: 'amount',    label: 'Amount (uqcb)',      placeholder: '1000000', numeric: true },
    ],
  },
  // QRC
  {
    key: 'QrcPurchase', label: 'QRC Purchase', category: 'QRC',
    description: 'Buy QRC by spending QCB through the AMM pool.',
    fields: [
      { name: 'qcb_amount',  label: 'QCB In (uqcb)',  placeholder: '1000000', numeric: true },
      { name: 'min_qrc_out', label: 'Min QRC Out',     placeholder: '0', numeric: true },
    ],
  },
  {
    key: 'QrcSpend', label: 'QRC Spend', category: 'QRC',
    description: 'Consume QRC to access a compute resource.',
    fields: [
      { name: 'resource', label: 'Resource',   placeholder: 'compute' },
      { name: 'units',    label: 'Units',       placeholder: '1', numeric: true },
      { name: 'amount',   label: 'QRC Amount',  placeholder: '100', numeric: true },
    ],
  },
  // Identity
  {
    key: 'RegisterIdentity', label: 'Register Identity', category: 'Identity',
    description: 'Register your address on the identity module to enable attestation.',
    fields: [],
  },
  {
    key: 'Attest', label: 'Attest', category: 'Identity',
    description: 'Vouch for another identity, raising their trust tier.',
    fields: [
      { name: 'claimant_id', label: 'Claimant Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  {
    key: 'RevokeAttestation', label: 'Revoke Attestation', category: 'Identity',
    description: 'Withdraw a previously granted attestation.',
    fields: [
      { name: 'attested_id', label: 'Attested Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  {
    key: 'ReportSuspectedSybil', label: 'Report Sybil', category: 'Identity',
    description: 'Flag an address as a suspected sybil identity.',
    fields: [
      { name: 'suspected_id', label: 'Suspected Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  {
    key: 'ConfirmSybil', label: 'Confirm Sybil', category: 'Identity',
    description: 'Confirm a sybil report (validator governance action).',
    fields: [
      { name: 'sybil_id', label: 'Sybil Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  {
    key: 'ReverseSybil', label: 'Reverse Sybil', category: 'Identity',
    description: 'Reverse a sybil determination (validator governance action).',
    fields: [
      { name: 'sybil_id', label: 'Sybil Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  // Agents
  {
    key: 'SponsorAgent', label: 'Sponsor Agent', category: 'Agents',
    description: 'Sponsor an AI agent address, allowing it to act on your behalf.',
    fields: [
      { name: 'agent_address', label: 'Agent Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  {
    key: 'RevokeAgent', label: 'Revoke Agent', category: 'Agents',
    description: 'Revoke a sponsored agent by its address.',
    fields: [
      { name: 'agent_address', label: 'Agent Address', placeholder: 'qforge1…', mono: true },
    ],
  },
  {
    key: 'RevokeAgentFull', label: 'Revoke Agent (Full)', category: 'Agents',
    description: 'Fully revoke an agent by its ID, clearing all permissions.',
    fields: [
      { name: 'agent_id', label: 'Agent ID', placeholder: 'agent_…', mono: true },
    ],
  },
  {
    key: 'AuthorizeAgent', label: 'Authorize Agent', category: 'Agents',
    description: 'Grant an agent expanded permissions.',
    fields: [
      { name: 'agent_id', label: 'Agent ID', placeholder: 'agent_…', mono: true },
    ],
  },
  {
    key: 'SuspendAgent', label: 'Suspend Agent', category: 'Agents',
    description: 'Temporarily suspend an agent with a reason.',
    fields: [
      { name: 'agent_id', label: 'Agent ID',  placeholder: 'agent_…', mono: true },
      { name: 'reason',   label: 'Reason',     placeholder: 'policy violation' },
    ],
  },
  // Custom
  {
    key: 'Custom', label: 'Custom', category: 'Custom',
    description: 'Send an arbitrary module call with a raw JSON payload.',
    fields: [
      { name: 'module',  label: 'Module',  placeholder: 'my_module' },
      { name: 'payload', label: 'Payload (JSON)', placeholder: '{"action":"do_thing"}', mono: true },
    ],
  },
];

const CATEGORIES = [...new Set(VARIANTS.map((v) => v.category))];

// ── Component ───────────────────────────────────────────────────────────────

export function TxBuilder() {
  const [nodeUrl, setNodeUrl] = useState(DEFAULT_NODE_URL);
  const [draftUrl, setDraftUrl] = useState(DEFAULT_NODE_URL);
  const [fromAddr, setFromAddr] = useState('');
  const [nonce, setNonce] = useState('0');
  const [variantKey, setVariantKey] = useState('Transfer');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: true; txId: string; status: string } | { ok: false; error: string } | null>(null);

  const variant = VARIANTS.find((v) => v.key === variantKey)!;

  const setField = (name: string, val: string) =>
    setFields((prev) => ({ ...prev, [name]: val }));

  const buildBody = (): TxBody => {
    if (variant.fields.length === 0) {
      return { [variant.key]: {} } as TxBody;
    }
    const payload: Record<string, string | number> = {};
    for (const f of variant.fields) {
      const raw = fields[f.name] ?? '';
      payload[f.name] = f.numeric ? (Number(raw) || 0) : raw;
    }
    return { [variant.key]: payload } as TxBody;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      const res = await submitTx(nodeUrl, fromAddr, Number(nonce) || 0, buildBody());
      setResult({ ok: true, txId: res.tx_id, status: res.status });
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectVariant = (key: string) => {
    setVariantKey(key);
    setFields({});
    setResult(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-ink-50">Transaction Builder</h1>
        <p className="text-sm text-ink-400 mt-0.5">Compose and submit transactions to a running node</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Node + signer */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-ink-300 uppercase tracking-wider">Connection & Signer</h2>
          <div>
            <label className="label">Node RPC URL</label>
            <input
              className="input-mono text-xs"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              onBlur={() => setNodeUrl(draftUrl)}
              placeholder="http://localhost:8080"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sender Address</label>
              <input
                className="input-mono text-xs"
                value={fromAddr}
                onChange={(e) => setFromAddr(e.target.value)}
                placeholder="qcb1alice"
                required
              />
            </div>
            <div>
              <label className="label">Nonce</label>
              <input
                className="input-mono text-xs"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                placeholder="0"
                type="number"
                min="0"
              />
              <p className="text-[11px] text-ink-500 mt-1">Check /api/accounts/&lt;addr&gt; for current nonce</p>
            </div>
          </div>
        </div>

        {/* Variant selector */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-ink-300 uppercase tracking-wider">Transaction Type</h2>

          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {VARIANTS.filter((v) => v.category === cat).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => selectVariant(v.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      variantKey === v.key
                        ? 'bg-forge-500/15 text-forge-400 border-forge-500/30'
                        : 'text-ink-300 border-ink-600 hover:border-ink-500 hover:text-ink-100'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {variant.description && (
            <p className="text-xs text-ink-400 border-t border-ink-700/50 pt-3">{variant.description}</p>
          )}
        </div>

        {/* Fields */}
        {variant.fields.length > 0 && (
          <div className="card p-5 space-y-4">
            <h2 className="text-xs font-semibold text-ink-300 uppercase tracking-wider">
              {variant.label} Fields
            </h2>
            {variant.fields.map((f) => (
              <div key={f.name}>
                <label className="label">{f.label}</label>
                <input
                  className={f.mono ? 'input-mono' : 'input-field'}
                  value={fields[f.name] ?? ''}
                  onChange={(e) => setField(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  required
                />
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-ink-400 uppercase tracking-wider font-medium">Payload preview</p>
          </div>
          <pre className="json-viewer text-[11px] max-h-[180px]">
            {JSON.stringify(
              {
                id: `tx-${fromAddr || '<sender>'}-${nonce}-…`,
                sender: fromAddr || '<sender>',
                nonce: Number(nonce) || 0,
                body: buildBody(),
                gas_limit: 200000,
              },
              null,
              2,
            )}
          </pre>
        </div>

        {/* Result */}
        {result && (
          result.ok ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-success-500/10 border border-success-500/30">
              <CheckCircle2 size={16} className="text-success-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="text-success-400 font-medium">Transaction queued</p>
                <p className="font-mono text-xs text-ink-300 break-all">{result.txId}</p>
                <p className="text-xs text-ink-400">Status: {result.status}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-danger-500/10 border border-danger-500/30">
              <AlertCircle size={16} className="text-danger-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-danger-400 font-medium">Submission failed</p>
                <p className="text-xs text-ink-400 mt-0.5">{result.error}</p>
              </div>
            </div>
          )
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !fromAddr}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send size={15} />
              Submit Transaction
            </>
          )}
        </button>
      </form>
    </div>
  );
}
