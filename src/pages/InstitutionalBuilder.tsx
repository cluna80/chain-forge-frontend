import { useState } from 'react';
import {
  fetchInstitutionalTemplates,
  validateInstitutionalSpec,
  generateInstitutionalChain,
  fetchInstitutionalArtifact,
  type InstitutionalTemplateInfo,
  type InstitutionalGenerateResult,
} from '@/lib/nodeApi';

// ── Types that mirror the Rust ChainSpec ──────────────────────────────────────

interface GovernanceConfig {
  approval_threshold_pct: number;
  execution_delay_blocks: number;
  constitutional_governance: boolean;
}

interface NetworkConfig {
  p2p_port: number;
  rpc_port: number;
  max_peers: number;
  discovery: 'mdns' | 'bootstrap' | 'both';
}

type CryptoPolicy = 'ml_dsa_65' | 'ed25519' | 'hybrid';
type ConsensusProfile = 'tendermint_bft' | 'pq_hot_stuff2';

interface ChainSpec {
  template: { type: string } & Record<string, unknown>;
  chain_id: string;
  chain_name: string;
  validator_count: number;
  consensus: ConsensusProfile;
  crypto: CryptoPolicy;
  governance: GovernanceConfig;
  network: NetworkConfig;
  block_time_ms: number;
}

function defaultTemplateConfig(templateId: string): { type: string } & Record<string, unknown> {
  switch (templateId) {
    case 'healthcare-l1':
      return {
        type: 'healthcare',
        fhir_integration: true,
        emergency_access_policy: 'break_glass',
        audit_policy: 'full',
        hipaa_compliant_audit: true,
      };
    case 'corrections-l1':
      return {
        type: 'corrections',
        evidence_immutability: true,
        incident_reporting: true,
        audit_policy: 'full',
      };
    case 'education-l1':
      return {
        type: 'education',
        vc_standard: 'w3c_vc',
        diploma_anchoring: true,
        transcript_anchoring: false,
        ferpa_compliant: true,
      };
    case 'enterprise-l1':
      return {
        type: 'enterprise',
        ai_agent_support: false,
        multi_sig_governance: true,
        confidential_tx: false,
        compliance_mode: true,
      };
    default:
      return { type: templateId };
  }
}

// ── Step indicators ───────────────────────────────────────────────────────────

const STEPS = ['Template', 'Chain Config', 'Advanced', 'Review', 'Artifacts'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                i < current
                  ? 'bg-green-600 border-green-600 text-white'
                  : i === current
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i === current ? 'text-indigo-400' : 'text-zinc-500'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 mt-[-12px] ${i < current ? 'bg-green-600' : 'bg-zinc-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Template picker ───────────────────────────────────────────────────

function TemplateCard({
  t,
  selected,
  onSelect,
}: {
  t: InstitutionalTemplateInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const icon: Record<string, string> = {
    'healthcare-l1': '🏥',
    'corrections-l1': '⚖️',
    'education-l1': '🎓',
    'enterprise-l1': '🏢',
  };
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-900/30'
          : 'border-zinc-700 bg-zinc-800/60 hover:border-zinc-500'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon[t.id] ?? '🔗'}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-100">{t.name}</div>
          <div className="text-sm text-zinc-400 mt-1">{t.description}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {t.modules.map((m) => (
              <span key={m} className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">{m}</span>
            ))}
          </div>
        </div>
        {selected && <div className="text-indigo-400 text-xl mt-1">✓</div>}
      </div>
    </button>
  );
}

function Step1Template({
  templates,
  loading,
  error,
  selected,
  onSelect,
  onNext,
}: {
  templates: InstitutionalTemplateInfo[];
  loading: boolean;
  error: string | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Choose a Template</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Select the institutional domain for your sovereign Layer-1 chain. All sensitive data stays off-chain; only cryptographic commitments are anchored.
      </p>
      {loading && <div className="text-zinc-400">Loading templates…</div>}
      {error && <div className="text-red-400 text-sm mb-4">Could not load templates: {error}. Is chain-forge-service running on port 7700?</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <TemplateCard key={t.id} t={t} selected={selected === t.id} onSelect={() => onSelect(t.id)} />
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Chain config ──────────────────────────────────────────────────────

function LabeledInput({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-zinc-500 mb-1">{hint}</p>}
      <input
        {...props}
        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function Step2ChainConfig({
  chainName,
  chainId,
  validatorCount,
  blockTimeMs,
  onChange,
  onBack,
  onNext,
}: {
  chainName: string;
  chainId: string;
  validatorCount: number;
  blockTimeMs: number;
  onChange: (field: string, value: string | number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const idValid = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/.test(chainId);
  const countValid = validatorCount >= 4;

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Chain Configuration</h2>
      <p className="text-zinc-400 text-sm mb-6">Basic identity for your institutional chain.</p>
      <div className="space-y-4">
        <LabeledInput
          label="Chain Name"
          value={chainName}
          onChange={(e) => onChange('chain_name', e.target.value)}
          placeholder="My Hospital Network"
        />
        <div>
          <LabeledInput
            label="Chain ID"
            value={chainId}
            onChange={(e) => onChange('chain_id', e.target.value.toLowerCase())}
            placeholder="my-hospital-1"
            hint="Lowercase letters, digits, hyphens. Used as directory name and domain separator seed."
          />
          {chainId && !idValid && (
            <p className="text-red-400 text-xs mt-1">Must be lowercase a–z, 0–9, hyphens; no leading/trailing hyphens.</p>
          )}
        </div>
        <div>
          <LabeledInput
            label="Validator Count"
            type="number"
            min={4}
            max={100}
            value={validatorCount}
            onChange={(e) => onChange('validator_count', parseInt(e.target.value) || 4)}
            hint="Minimum 4 (BFT: 3f+1 with f=1). Common: 4, 7, 10."
          />
          {!countValid && (
            <p className="text-red-400 text-xs mt-1">Minimum 4 validators required for BFT fault tolerance.</p>
          )}
          {countValid && (
            <p className="text-green-400 text-xs mt-1">
              BFT: tolerates {Math.floor((validatorCount - 1) / 3)} Byzantine fault(s), quorum = {Math.floor((2 * validatorCount) / 3) + 1}
            </p>
          )}
        </div>
        <LabeledInput
          label="Block Time (ms)"
          type="number"
          min={500}
          max={30000}
          value={blockTimeMs}
          onChange={(e) => onChange('block_time_ms', parseInt(e.target.value) || 3000)}
          hint="Default 3000ms. Institutional chains typically use 2000–5000ms."
        />
      </div>
      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-6 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-semibold">Back</button>
        <button
          onClick={onNext}
          disabled={!chainName || !idValid || !countValid}
          className="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Advanced (consensus, crypto, governance) ─────────────────────────

function Select({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-zinc-500 mb-1">{hint}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Step3Advanced({
  consensus,
  crypto,
  governance,
  network,
  onChange,
  onBack,
  onNext,
}: {
  consensus: ConsensusProfile;
  crypto: CryptoPolicy;
  governance: GovernanceConfig;
  network: NetworkConfig;
  onChange: (path: string, value: unknown) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const pqRequired = consensus === 'pq_hot_stuff2';

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Advanced Options</h2>
      <p className="text-zinc-400 text-sm mb-6">Consensus, cryptography, and governance. Defaults are production-ready.</p>
      <div className="space-y-5">
        <Select
          label="Consensus"
          value={consensus}
          onChange={(v) => onChange('consensus', v)}
          options={[
            { value: 'tendermint_bft', label: 'Tendermint BFT (devnet baseline)' },
            { value: 'pq_hot_stuff2', label: 'PQ-HotStuff-2 (requires ML-DSA-65)' },
          ]}
          hint="Tendermint BFT is the current devnet baseline. PQ-HotStuff-2 is the mainnet target."
        />
        <Select
          label="Cryptography"
          value={pqRequired ? 'ml_dsa_65' : crypto}
          onChange={(v) => onChange('crypto', v)}
          options={[
            { value: 'ml_dsa_65', label: 'ML-DSA-65 (FIPS 204 — recommended)' },
            { value: 'hybrid', label: 'Hybrid (Ed25519 + ML-DSA-65)' },
            { value: 'ed25519', label: 'Ed25519 (classical — legacy only)' },
          ]}
          hint={pqRequired ? 'PQ-HotStuff-2 requires ML-DSA-65 or Hybrid.' : 'ML-DSA-65 is the institutional default.'}
        />
        {pqRequired && crypto === 'ed25519' && (
          <p className="text-amber-400 text-xs">PQ-HotStuff-2 requires ML-DSA-65 or Hybrid. Crypto will be overridden.</p>
        )}

        <div className="border-t border-zinc-700 pt-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Governance</h3>
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              label="Approval Threshold (%)"
              type="number"
              min={51}
              max={100}
              value={governance.approval_threshold_pct}
              onChange={(e) => onChange('governance.approval_threshold_pct', parseInt(e.target.value) || 67)}
            />
            <LabeledInput
              label="Execution Delay (blocks)"
              type="number"
              min={0}
              max={10000}
              value={governance.execution_delay_blocks}
              onChange={(e) => onChange('governance.execution_delay_blocks', parseInt(e.target.value) || 100)}
            />
          </div>
        </div>

        <div className="border-t border-zinc-700 pt-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Network</h3>
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              label="P2P Port"
              type="number"
              value={network.p2p_port}
              onChange={(e) => onChange('network.p2p_port', parseInt(e.target.value) || 27000)}
            />
            <LabeledInput
              label="RPC Port"
              type="number"
              value={network.rpc_port}
              onChange={(e) => onChange('network.rpc_port', parseInt(e.target.value) || 8080)}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-6 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-semibold">Back</button>
        <button onClick={onNext} className="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Next</button>
      </div>
    </div>
  );
}

// ── Step 4: Review & generate ─────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-zinc-200 text-sm font-mono">{value}</span>
    </div>
  );
}

function Step4Review({
  spec,
  templateName,
  onBack,
  onGenerate,
  generating,
  error,
}: {
  spec: ChainSpec;
  templateName: string;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
}) {
  const f = Math.floor((spec.validator_count - 1) / 3);
  const q = Math.floor((2 * spec.validator_count) / 3) + 1;

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Review & Generate</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Confirm configuration. No private keys are generated — validators supply their own ML-DSA-65 keys before deployment.
      </p>
      <div className="bg-zinc-800/60 rounded-lg p-4 mb-4">
        <ReviewRow label="Template" value={templateName} />
        <ReviewRow label="Chain Name" value={spec.chain_name} />
        <ReviewRow label="Chain ID" value={spec.chain_id} />
        <ReviewRow label="Validators" value={`${spec.validator_count} (f=${f}, quorum=${q})`} />
        <ReviewRow label="Consensus" value={spec.consensus === 'tendermint_bft' ? 'Tendermint BFT' : 'PQ-HotStuff-2'} />
        <ReviewRow label="Cryptography" value={spec.crypto === 'ml_dsa_65' ? 'ML-DSA-65 (FIPS 204)' : spec.crypto} />
        <ReviewRow label="Block Time" value={`${spec.block_time_ms} ms`} />
        <ReviewRow label="Approval Threshold" value={`${spec.governance.approval_threshold_pct}%`} />
      </div>
      <div className="bg-amber-900/20 border border-amber-700/40 rounded p-3 text-amber-300 text-xs mb-4">
        Privacy notice: No patient data, inmate identifiers, student PII, or confidential contracts are written on-chain.
        Only cryptographic commitments (SHA-256 hashes) are anchored.
      </div>
      {error && <div className="text-red-400 text-sm mb-4 bg-red-900/20 p-3 rounded">{error}</div>}
      <div className="flex justify-between mt-4">
        <button onClick={onBack} disabled={generating} className="px-6 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-semibold disabled:opacity-40">Back</button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="px-6 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold"
        >
          {generating ? 'Generating…' : 'Generate Genesis'}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Artifacts ─────────────────────────────────────────────────────────

function Step5Artifacts({
  result,
  onViewArtifact,
  artifactContent,
  loadingArtifact,
  onReset,
}: {
  result: InstitutionalGenerateResult;
  onViewArtifact: (filename: string) => void;
  artifactContent: string | null;
  loadingArtifact: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-green-400 mb-1">Genesis Generated</h2>
      <p className="text-zinc-400 text-sm mb-6">Your institutional chain artifacts are ready.</p>
      <div className="bg-zinc-800/60 rounded-lg p-4 mb-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-400 text-sm">Chain ID</span>
          <span className="text-zinc-100 font-mono text-sm">{result.chain_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 text-sm">Template</span>
          <span className="text-zinc-100 font-mono text-sm">{result.template}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 text-sm">Genesis Hash</span>
          <span className="text-zinc-100 font-mono text-xs truncate max-w-[260px]">{result.genesis_hash}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400 text-sm">Domain Separator</span>
          <span className="text-zinc-100 font-mono text-xs truncate max-w-[260px]">{result.domain_separator}</span>
        </div>
        <div>
          <span className="text-zinc-400 text-sm">Artifacts Dir</span>
          <div className="text-zinc-300 font-mono text-xs mt-1 bg-zinc-900 p-2 rounded break-all">{result.artifacts_dir}</div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Artifacts</h3>
        <div className="flex gap-2">
          {result.artifacts.map((f) => (
            <button
              key={f}
              onClick={() => onViewArtifact(f)}
              className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-mono"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loadingArtifact && <div className="text-zinc-400 text-sm">Loading…</div>}
      {artifactContent && (
        <pre className="bg-zinc-900 rounded p-4 text-zinc-300 text-xs overflow-auto max-h-80 mb-4">
          {artifactContent}
        </pre>
      )}

      <div className="bg-blue-900/20 border border-blue-700/40 rounded p-3 text-blue-300 text-xs mb-4">
        Next steps: Distribute <code>genesis.json</code> to validators. Each validator must supply their own ML-DSA-65 public key.
        Private keys are never generated by this tool.
      </div>

      <div className="flex justify-end">
        <button onClick={onReset} className="px-6 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-semibold">Build Another</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function defaultSpec(templateId: string): ChainSpec {
  return {
    template: defaultTemplateConfig(templateId),
    chain_id: '',
    chain_name: '',
    validator_count: 4,
    consensus: 'tendermint_bft',
    crypto: 'ml_dsa_65',
    governance: { approval_threshold_pct: 67, execution_delay_blocks: 100, constitutional_governance: true },
    network: { p2p_port: 27000, rpc_port: 8080, max_peers: 50, discovery: 'bootstrap' },
    block_time_ms: 3000,
  };
}

export function InstitutionalBuilder() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<InstitutionalTemplateInfo[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [spec, setSpec] = useState<ChainSpec | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<InstitutionalGenerateResult | null>(null);

  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [loadingArtifact, setLoadingArtifact] = useState(false);

  // Load templates on mount (or when step returns to 0)
  const loadTemplates = async () => {
    if (templates.length > 0) return;
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const t = await fetchInstitutionalTemplates();
      setTemplates(t);
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : String(e));
    } finally {
      setTemplatesLoading(false);
    }
  };

  if (step === 0 && templates.length === 0 && !templatesLoading && !templatesError) {
    loadTemplates();
  }

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    setSpec(defaultSpec(id));
  };

  const handleSpecChange = (path: string, value: unknown) => {
    if (!spec) return;
    const parts = path.split('.');
    if (parts.length === 1) {
      setSpec({ ...spec, [parts[0]]: value });
    } else if (parts.length === 2) {
      const parent = parts[0] as keyof ChainSpec;
      setSpec({
        ...spec,
        [parent]: { ...(spec[parent] as Record<string, unknown>), [parts[1]]: value },
      });
    }
  };

  const handleGenerate = async () => {
    if (!spec) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const r = await generateInstitutionalChain(spec);
      setResult(r);
      setStep(4);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewArtifact = async (filename: string) => {
    if (!result) return;
    setLoadingArtifact(true);
    setArtifactContent(null);
    try {
      const data = await fetchInstitutionalArtifact(result.chain_id, filename);
      setArtifactContent(JSON.stringify(data, null, 2));
    } catch (e) {
      setArtifactContent(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingArtifact(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedTemplateId(null);
    setSpec(null);
    setResult(null);
    setArtifactContent(null);
    setGenerateError(null);
  };

  const templateName = templates.find((t) => t.id === selectedTemplateId)?.name ?? selectedTemplateId ?? '';

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Institutional Chain Builder</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Generate a sovereign Layer-1 blockchain for healthcare, corrections, education, or enterprise.
          Powered by ML-DSA-65 post-quantum cryptography.
        </p>
      </div>

      <StepBar current={step} />

      {step === 0 && (
        <Step1Template
          templates={templates}
          loading={templatesLoading}
          error={templatesError}
          selected={selectedTemplateId}
          onSelect={handleSelectTemplate}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && spec && (
        <Step2ChainConfig
          chainName={spec.chain_name}
          chainId={spec.chain_id}
          validatorCount={spec.validator_count}
          blockTimeMs={spec.block_time_ms}
          onChange={(field, value) => setSpec({ ...spec, [field]: value })}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && spec && (
        <Step3Advanced
          consensus={spec.consensus}
          crypto={spec.crypto}
          governance={spec.governance}
          network={spec.network}
          onChange={handleSpecChange}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && spec && (
        <Step4Review
          spec={spec}
          templateName={templateName}
          onBack={() => setStep(2)}
          onGenerate={handleGenerate}
          generating={generating}
          error={generateError}
        />
      )}

      {step === 4 && result && (
        <Step5Artifacts
          result={result}
          onViewArtifact={handleViewArtifact}
          artifactContent={artifactContent}
          loadingArtifact={loadingArtifact}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
