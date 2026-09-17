import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ENGINE_MODULES, ENGINE_VERSION, getLayerStatusForWizardStep } from '@/lib/engineData';
import type {
  ChainConfig, Chain, SignatureScheme, PqcAlgorithm, MigrationTrigger, HashWidth,
  EnvironmentMode, PeerDiscovery, AccountRole, GenesisAccount,
} from '@/types';
import { JsonViewer } from '@/components/JsonViewer';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
  Settings, Cpu, Layers, Boxes, FileJson, Upload, X, Shield,
  Globe, Network, Gauge, Users, Plus, Trash2,
} from 'lucide-react';

interface WizardProps {
  onDone: () => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'basics',       label: 'Basics',      icon: Settings },
  { id: 'environment',  label: 'Environment', icon: Globe    },
  { id: 'consensus',    label: 'Consensus',   icon: Cpu      },
  { id: 'execution',    label: 'Execution',   icon: Layers   },
  { id: 'modules',      label: 'Modules',     icon: Boxes    },
  { id: 'cryptography', label: 'Crypto',      icon: Shield   },
  { id: 'network',      label: 'Network',     icon: Network  },
  { id: 'limits',       label: 'Limits',      icon: Gauge    },
  { id: 'accounts',     label: 'Accounts',    icon: Users    },
  { id: 'generate',     label: 'Review',      icon: FileJson },
];

const newAccountId = () => `acct_${Math.random().toString(36).slice(2, 10)}`;

const DEFAULT_CONFIG: ChainConfig = {
  basics: {
    chainName: '',
    chainId: '',
    tokenName: '',
    tokenSymbol: '',
    tokenDenom: '',
    addressPrefix: '',
    maxSupply: '',
  },
  environment: {
    mode: 'testnet',
    faucetEnabled: true,
    relaxedLimits: true,
  },
  consensus: {
    mechanism: 'pos',
    validatorSetSize: 4,
    blockTimeMs: 5000,
  },
  execution: {
    stateModel: 'account',
    parallelExecution: false,
    gasModel: 'dynamic',
  },
  modules: {
    selected: ['bank', 'staking'],
    customModule: '',
  },
  cryptography: {
    signatureScheme: 'hybrid',
    pqcAlgorithm: 'ml-dsa',
    migrationTrigger: 'nist-guidance',
    hashWidth: 256,
    validatorScheme: 'pqc-native',
  },
  network: {
    networkId: '',
    p2pPort: 26656,
    rpcPort: 26657,
    bootstrapNodes: '',
    peerDiscovery: 'both',
    maxPeers: 50,
  },
  limits: {
    maxBlockBytes: 1_048_576,   // 1 MiB
    maxTxBytes: 65_536,         // 64 KiB — bump if using PQC
    blockGasLimit: 10_000_000,
    mempoolSize: 5_000,
    mempoolTtlSeconds: 300,
  },
  genesisAccounts: {
    accounts: [
      { id: newAccountId(), label: 'Validator 1', address: '', balance: '', role: 'validator' },
      { id: newAccountId(), label: 'Treasury',    address: '', balance: '', role: 'treasury'  },
    ],
  },
};

// Minimum tx size a PQC signature realistically needs (sig + overhead), per
// Whitepaper Section 10.3. Used only to warn; doesn't block.
const PQC_MIN_TX_BYTES: Record<PqcAlgorithm, number> = {
  'ml-dsa':       4_096,
  'falcon':       2_048,
  'sphincs-plus': 65_536,
};

export function Wizard({ onDone, onCancel }: WizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<ChainConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Chain | null>(null);

  const updateConfig = <K extends keyof ChainConfig>(key: K, value: Partial<ChainConfig[K]>) => {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }));
  };

  const canProceed = useMemo(() => {
    const b = config.basics;
    switch (STEPS[step].id) {
      case 'basics':
        return b.chainName.trim() !== '' && b.chainId.trim() !== '' &&
               b.tokenSymbol.trim() !== '' && b.tokenDenom.trim() !== '' &&
               b.addressPrefix.trim() !== '';
      case 'consensus':
        return config.consensus.validatorSetSize > 0 && config.consensus.blockTimeMs > 0;
      case 'network':
        return config.network.networkId.trim() !== '' &&
               config.network.p2pPort > 0 && config.network.rpcPort > 0 &&
               config.network.p2pPort !== config.network.rpcPort &&
               config.network.maxPeers > 0;
      case 'limits': {
        const l = config.limits;
        return l.maxBlockBytes > 0 && l.maxTxBytes > 0 && l.maxTxBytes <= l.maxBlockBytes &&
               l.blockGasLimit > 0 && l.mempoolSize > 0 && l.mempoolTtlSeconds > 0;
      }
      case 'accounts': {
        const accts = config.genesisAccounts.accounts;
        return accts.length > 0 &&
               accts.every((a) => a.address.trim() !== '' && a.balance.trim() !== '');
      }
      default:
        return true;
    }
  }, [step, config]);

  const genesisJson = useMemo(() => {
    const crypto = config.cryptography;
    return {
      chain_id: config.basics.chainId,
      chain_name: config.basics.chainName,
      engine_version: ENGINE_VERSION,
      environment: {
        mode: config.environment.mode,
        faucet_enabled: config.environment.faucetEnabled,
        relaxed_limits: config.environment.relaxedLimits,
      },
      native_token: {
        name: config.basics.tokenName,
        symbol: config.basics.tokenSymbol,
        denom: config.basics.tokenDenom,
        max_supply: config.basics.maxSupply || null,
      },
      address_prefix: config.basics.addressPrefix,
      consensus: {
        type: config.consensus.mechanism === 'pos' ? 'proof-of-stake' : 'proof-of-authority',
        validator_set_size: config.consensus.validatorSetSize,
        block_time_ms: config.consensus.blockTimeMs,
      },
      execution: {
        state_model: config.execution.stateModel,
        parallel_execution: config.execution.parallelExecution,
        gas_model: config.execution.gasModel,
      },
      modules: config.modules.selected,
      custom_modules: config.modules.customModule.trim()
        ? config.modules.customModule.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      cryptography: {
        signature_scheme: crypto.signatureScheme,
        pqc_algorithm: crypto.signatureScheme !== 'classical' ? crypto.pqcAlgorithm : null,
        migration_trigger: crypto.migrationTrigger,
        hash_width: crypto.hashWidth,
        validator_scheme: crypto.validatorScheme,
      },
      network: {
        network_id: config.network.networkId,
        p2p_port: config.network.p2pPort,
        rpc_port: config.network.rpcPort,
        bootstrap_nodes: config.network.bootstrapNodes.trim()
          ? config.network.bootstrapNodes.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
        peer_discovery: config.network.peerDiscovery,
        max_peers: config.network.maxPeers,
      },
      limits: {
        max_block_bytes: config.limits.maxBlockBytes,
        max_tx_bytes: config.limits.maxTxBytes,
        block_gas_limit: config.limits.blockGasLimit,
        mempool_size: config.limits.mempoolSize,
        mempool_ttl_seconds: config.limits.mempoolTtlSeconds,
      },
      genesis_accounts: config.genesisAccounts.accounts.map(({ label, address, balance, role }) => ({
        label, address, balance, role,
      })),
      genesis_time: new Date().toISOString(),
    };
  }, [config]);

  const NODE_API = 'http://localhost:8080';

  const handleGenerate = async () => {
    setSaving(true);
    setSaveError(null);

    // 1. Try to call the node's build API
    let nodeResponse: { status: string; message: string; node_status_url?: string } | null = null;
    try {
      const res = await fetch(`${NODE_API}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genesisJson),
      });
      nodeResponse = await res.json();
    } catch {
      // Node not running — that's fine in Phase 0, just save to Supabase
      nodeResponse = null;
    }

    // 2. Save to Supabase regardless
    const insertData = {
      name: config.basics.chainName,
      chain_id: config.basics.chainId,
      status: (nodeResponse?.status === 'accepted' ? 'building' : 'draft') as 'building' | 'draft',
      engine_version: ENGINE_VERSION,
      config,
      genesis_json: genesisJson,
      build_logs: nodeResponse
        ? `Node response: ${nodeResponse.message}`
        : 'Node not reachable — config saved as draft. Start chain-forge-node and regenerate to connect.',
      node_status: nodeResponse ? { url: nodeResponse.node_status_url } : null,
      explorer_url: null,
      repo_url: null,
    };

    const { data, error } = await supabase
      .from('chains')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setGenerated(data as Chain);
    setSaving(false);
  };

  const generateStatus = getLayerStatusForWizardStep('generate');
  const currentId = STEPS[step].id;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Chain</h1>
          <p className="text-sm text-ink-300 mt-1">
            Configure a blockchain on the Chain Forge engine
          </p>
        </div>
        <button onClick={onCancel} className="btn-ghost flex items-center gap-2">
          <X size={16} />
          Cancel
        </button>
      </div>

      {/* Step indicator */}
      <div className="relative mb-10">
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;
            const layerStatus = getLayerStatusForWizardStep(s.id);
            return (
              <div key={s.id} className="relative flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'border-forge-500 bg-forge-500/10 text-forge-400'
                      : isComplete
                      ? 'border-success-500 bg-success-500/10 text-success-400'
                      : 'border-ink-600 bg-ink-900 text-ink-400'
                  }`}
                >
                  {isComplete ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className={`text-[11px] font-medium ${isActive ? 'text-white' : 'text-ink-400'}`}>
                  {s.label}
                </span>
                {layerStatus === 'coming-soon' && (
                  <span className="text-[9px] text-ink-500 italic">soon</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute top-[18px] left-[18px] right-[18px] h-0.5 bg-ink-700 -z-0">
          <div
            className="h-full bg-forge-500 transition-all duration-300"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="card p-7 animate-fade-in" key={step}>
        {currentId === 'basics'       && <StepBasics       config={config.basics}       update={updateConfig} />}
        {currentId === 'environment'  && <StepEnvironment  config={config.environment}  update={updateConfig} />}
        {currentId === 'consensus'    && <StepConsensus    config={config.consensus}    update={updateConfig} />}
        {currentId === 'execution'    && <StepExecution    config={config.execution}    update={updateConfig} />}
        {currentId === 'modules'      && <StepModules      config={config.modules}      update={updateConfig} />}
        {currentId === 'cryptography' && <StepCryptography config={config.cryptography} update={updateConfig} />}
        {currentId === 'network'      && <StepNetwork      config={config.network}      basics={config.basics} update={updateConfig} />}
        {currentId === 'limits'       && <StepLimits       config={config.limits}       crypto={config.cryptography} update={updateConfig} />}
        {currentId === 'accounts'     && <StepAccounts     config={config.genesisAccounts} basics={config.basics} consensus={config.consensus} update={updateConfig} />}
        {currentId === 'generate' && (
          <StepGenerate
            genesisJson={genesisJson}
            config={config}
            saving={saving}
            saveError={saveError}
            generated={generated}
            generateStatus={generateStatus}
            onGenerate={handleGenerate}
          />
        )}
      </div>

      {/* Navigation */}
      {!generated && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="btn-primary flex items-center gap-2"
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      )}

      {generated && (
        <div className="flex items-center justify-end mt-6">
          <button onClick={onDone} className="btn-primary flex items-center gap-2">
            <Check size={16} />
            View in Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

type Update = <K extends keyof ChainConfig>(key: K, value: Partial<ChainConfig[K]>) => void;

// Shared option-card button used across steps
function OptionCard({
  selected, onClick, title, desc, right, disabled,
}: {
  selected: boolean; onClick: () => void; title: string; desc: string;
  right?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-lg border text-left transition-all ${
        disabled
          ? 'border-ink-700 bg-ink-900/30 opacity-60 cursor-not-allowed'
          : selected
          ? 'border-forge-500 bg-forge-500/10'
          : 'border-ink-600 bg-ink-900/50 hover:border-ink-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-sm text-white">{title}</div>
        {right}
      </div>
      <div className="text-xs text-ink-400">{desc}</div>
    </button>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-forge-500' : 'bg-ink-600'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 p-3 rounded-lg border border-warn-500/30 bg-warn-500/5 flex items-start gap-3">
      <AlertCircle size={16} className="text-warn-400 shrink-0 mt-0.5" />
      <p className="text-xs text-ink-300">{children}</p>
    </div>
  );
}

// --- Step: Basics ---
function StepBasics({ config, update }: { config: ChainConfig['basics']; update: Update }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Chain Basics</h2>
      <p className="text-sm text-ink-300 mb-6">Identity and native token configuration for your blockchain.</p>

      <div className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <label className="label">Chain Name</label>
          <input type="text" value={config.chainName}
            onChange={(e) => update('basics', { chainName: e.target.value })}
            className="input-field" placeholder="e.g. QuarkCharmBit" />
        </div>
        <div>
          <label className="label">Chain ID</label>
          <input type="text" value={config.chainId}
            onChange={(e) => update('basics', { chainId: e.target.value })}
            className="input-mono" placeholder="e.g. qcb-testnet-1" />
        </div>
        <div>
          <label className="label">Address Prefix</label>
          <input type="text" value={config.addressPrefix}
            onChange={(e) => update('basics', { addressPrefix: e.target.value })}
            className="input-mono" placeholder="e.g. qcb" />
        </div>
        <div>
          <label className="label">Token Name</label>
          <input type="text" value={config.tokenName}
            onChange={(e) => update('basics', { tokenName: e.target.value })}
            className="input-field" placeholder="e.g. QuarkCharm" />
        </div>
        <div>
          <label className="label">Token Symbol</label>
          <input type="text" value={config.tokenSymbol}
            onChange={(e) => update('basics', { tokenSymbol: e.target.value.toUpperCase() })}
            className="input-mono" placeholder="e.g. QCB" maxLength={10} />
        </div>
        <div>
          <label className="label">Token Denom</label>
          <input type="text" value={config.tokenDenom}
            onChange={(e) => update('basics', { tokenDenom: e.target.value })}
            className="input-mono" placeholder="e.g. uqcb" />
        </div>
        <div>
          <label className="label">Max Supply</label>
          <input type="text" value={config.maxSupply}
            onChange={(e) => update('basics', { maxSupply: e.target.value })}
            className="input-mono" placeholder="e.g. 210000000 (optional)" />
        </div>
      </div>
    </div>
  );
}

// --- Step: Environment ---
function StepEnvironment({ config, update }: { config: ChainConfig['environment']; update: Update }) {
  const MODES: { id: EnvironmentMode; label: string; desc: string }[] = [
    { id: 'devnet',  label: 'Devnet',  desc: 'Local single-machine development. Faucet on, limits relaxed, throwaway state.' },
    { id: 'testnet', label: 'Testnet', desc: 'Multi-node public test network. Faucet on, real consensus, no real value.' },
    { id: 'mainnet', label: 'Mainnet', desc: 'Production. Faucet off, strict limits, real value at stake.' },
  ];

  const setMode = (mode: EnvironmentMode) => {
    // Sensible defaults per mode; user can still override the toggles below.
    update('environment', {
      mode,
      faucetEnabled: mode !== 'mainnet',
      relaxedLimits: mode !== 'mainnet',
    });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Environment</h2>
      <p className="text-sm text-ink-300 mb-6">
        What kind of network is this? Sets defaults for faucet, limits, and safety rails.
        QCB will run as testnet for years before mainnet (Whitepaper Section 11).
      </p>

      <div className="space-y-5">
        <div>
          <label className="label">Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map((m) => (
              <OptionCard key={m.id} selected={config.mode === m.id} onClick={() => setMode(m.id)}
                title={m.label} desc={m.desc} />
            ))}
          </div>
        </div>

        {config.mode === 'mainnet' && (
          <Warn>
            <span className="text-warn-300 font-medium">Mainnet selected. </span>
            The Chain Forge engine has no consensus, P2P, execution, or state layer built yet
            (Engine Status). This config will be saved, but there is nothing to run it on.
          </Warn>
        )}

        <div className="flex items-center justify-between p-4 rounded-lg border border-ink-600 bg-ink-900/50">
          <div>
            <div className="text-sm font-medium text-white">Faucet Enabled</div>
            <div className="text-xs text-ink-400 mt-0.5">Free test tokens for developers. Never enable on mainnet.</div>
          </div>
          <Toggle on={config.faucetEnabled} onClick={() => update('environment', { faucetEnabled: !config.faucetEnabled })} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-ink-600 bg-ink-900/50">
          <div>
            <div className="text-sm font-medium text-white">Relaxed Limits</div>
            <div className="text-xs text-ink-400 mt-0.5">
              Loosen block/tx size and gas limits for experimentation. Overrides the Limits step for enforcement.
            </div>
          </div>
          <Toggle on={config.relaxedLimits} onClick={() => update('environment', { relaxedLimits: !config.relaxedLimits })} />
        </div>
      </div>
    </div>
  );
}

// --- Step: Consensus ---
function StepConsensus({ config, update }: { config: ChainConfig['consensus']; update: Update }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Consensus</h2>
      <p className="text-sm text-ink-300 mb-6">
        Select the consensus mechanism and validator parameters. Personhood-weighted BFT is QCB's native mode
        — other options are available for general-purpose chains.
      </p>

      <div className="space-y-5">
        <div>
          <label className="label">Consensus Mechanism</label>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard selected={config.mechanism === 'pos'} onClick={() => update('consensus', { mechanism: 'pos' })}
              title="Proof of Stake (Personhood-Bounded)"
              desc="Validator power capped per verified human — QCB default (Section 3)" />
            <OptionCard selected={config.mechanism === 'poa'} onClick={() => update('consensus', { mechanism: 'poa' })}
              title="Proof of Authority"
              desc="Fixed authority set — useful for private/consortium chains" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label">Validator Set Size</label>
            <input type="number" value={config.validatorSetSize} min={1} max={200}
              onChange={(e) => update('consensus', { validatorSetSize: Number(e.target.value) })}
              className="input-mono" />
            <p className="text-xs text-ink-400 mt-1.5">Testnet: 4–10. Mainnet: 50–100. See Whitepaper Q14 re: liveness.</p>
          </div>
          <div>
            <label className="label">Block Time (ms)</label>
            <input type="number" value={config.blockTimeMs} min={500} max={30000} step={500}
              onChange={(e) => update('consensus', { blockTimeMs: Number(e.target.value) })}
              className="input-mono" />
            <p className="text-xs text-ink-400 mt-1.5">5000ms = 5s blocks. Lower = faster but harder on validators.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Step: Execution ---
function StepExecution({ config, update }: { config: ChainConfig['execution']; update: Update }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Execution Engine</h2>
      <p className="text-sm text-ink-300 mb-6">State model, gas metering, and execution strategy.</p>

      <div className="space-y-5">
        <div>
          <label className="label">State Model</label>
          <div className="grid grid-cols-3 gap-3">
            {(['account', 'utxo', 'hybrid'] as const).map((m) => (
              <OptionCard key={m} selected={config.stateModel === m} onClick={() => update('execution', { stateModel: m })}
                title={m.charAt(0).toUpperCase() + m.slice(1)}
                desc={m === 'account' ? 'Ethereum-style account balances' : m === 'utxo' ? 'Bitcoin-style unspent outputs' : 'Mixed model (QCB default)'} />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Gas Model</label>
          <div className="grid grid-cols-3 gap-3">
            {(['fixed', 'dynamic', 'eip-1559-style'] as const).map((m) => (
              <OptionCard key={m} selected={config.gasModel === m} onClick={() => update('execution', { gasModel: m })}
                title={m === 'eip-1559-style' ? 'EIP-1559 Style' : m.charAt(0).toUpperCase() + m.slice(1)}
                desc={m === 'fixed' ? 'Flat fee per tx' : m === 'dynamic' ? 'Market-driven fee' : 'Base + priority fee with burns'} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-ink-600 bg-ink-900/50">
          <div>
            <div className="text-sm font-medium text-white">Parallel Execution</div>
            <div className="text-xs text-ink-400 mt-0.5">Execute non-conflicting transactions concurrently. Not yet implemented in the engine.</div>
          </div>
          <Toggle on={config.parallelExecution} onClick={() => update('execution', { parallelExecution: !config.parallelExecution })} />
        </div>
      </div>
    </div>
  );
}

// --- Step: Modules ---
function StepModules({ config, update }: { config: ChainConfig['modules']; update: Update }) {
  const toggleModule = (id: string) => {
    const selected = config.selected.includes(id)
      ? config.selected.filter((m) => m !== id)
      : [...config.selected, id];
    update('modules', { selected });
  };

  const grouped = ENGINE_MODULES.reduce<Record<string, typeof ENGINE_MODULES>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Engine Modules</h2>
      <p className="text-sm text-ink-300 mb-6">Select built-in modules and add custom Rust module paths.</p>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, mods]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{category}</h3>
            <div className="grid grid-cols-2 gap-3">
              {mods.map((mod) => (
                <OptionCard key={mod.id} disabled={!mod.available}
                  selected={config.selected.includes(mod.id)}
                  onClick={() => mod.available && toggleModule(mod.id)}
                  title={mod.name} desc={mod.description}
                  right={
                    config.selected.includes(mod.id)
                      ? <Check size={16} className="text-forge-400" />
                      : !mod.available ? <span className="text-[10px] text-ink-500 italic">soon</span> : null
                  } />
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="label flex items-center gap-2"><Upload size={14} />Custom Rust Module Paths</label>
          <textarea value={config.customModule}
            onChange={(e) => update('modules', { customModule: e.target.value })}
            className="input-mono h-24 resize-none"
            placeholder={"One path per line, e.g.:\ncrates/qcb-charm-confinement\ncrates/qcb-cirfi"} />
          <p className="text-xs text-ink-400 mt-1.5">
            For porting QCB-specific modules (Charm Confinement, Intrinsic Charm, CirFi, Charmed Agents). The engine will compile these during the build step.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Step: Cryptography ---
function StepCryptography({ config, update }: { config: ChainConfig['cryptography']; update: Update }) {
  const showPqcOptions = config.signatureScheme !== 'classical';

  const PQC_ALGORITHMS: { id: PqcAlgorithm; label: string; sigSize: string; note: string }[] = [
    { id: 'ml-dsa',       label: 'ML-DSA (Dilithium)', sigSize: '~2.4 KB',   note: 'NIST standard. Best support & tooling. Largest signature size of the practical options.' },
    { id: 'falcon',       label: 'Falcon',             sigSize: '~0.7 KB',   note: 'Smaller signatures than Dilithium. Complex, harder to implement safely.' },
    { id: 'sphincs-plus', label: 'SPHINCS+',           sigSize: '~8–50 KB',  note: 'Hash-based, most conservative. Largest signatures — not recommended for high-throughput.' },
  ];

  const MIGRATION_TRIGGERS: { id: MigrationTrigger; label: string; note: string }[] = [
    { id: 'nist-guidance',     label: 'NIST Guidance Update',  note: 'Trigger on NIST deprecating ECDSA or recommending PQC migration.' },
    { id: 'demonstrated-crqc', label: 'Demonstrated CRQC',     note: 'Trigger when a cryptographically-relevant quantum computer is publicly demonstrated.' },
    { id: 'calendar-review',   label: 'Fixed Calendar Review', note: 'Periodic governance vote on a set schedule (e.g. every 2 years).' },
    { id: 'governance-vote',   label: 'Governance Vote Only',  note: 'Migration only if the community explicitly passes a proposal.' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Cryptographic Primitives</h2>
      <p className="text-sm text-ink-300 mb-4">
        Post-quantum security for signatures, hashing, and validator keys. Whitepaper Section 10 — a constitutional-layer setting.
      </p>

      {showPqcOptions && config.pqcAlgorithm === 'ml-dsa' && (
        <Warn>
          <span className="text-warn-300 font-medium">Size tradeoff: </span>
          ML-DSA signatures are ~2.4 KB vs ECDSA's 64 bytes. This directly affects merchant payment throughput
          (Whitepaper Section 8). The Limits step will flag if your max tx size is too small. See Open Question 16.
        </Warn>
      )}

      <div className="space-y-6">
        <div>
          <label className="label">Signature Scheme</label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: 'classical' as SignatureScheme,  label: 'Classical',  desc: "ECDSA only. Vulnerable to Shor's algorithm once a CRQC exists." },
              { id: 'hybrid' as SignatureScheme,     label: 'Hybrid',     desc: 'ECDSA + PQC in parallel. Migration-safe, higher signature overhead.' },
              { id: 'pqc-native' as SignatureScheme, label: 'PQC-Native', desc: 'Post-quantum only from genesis. Most future-proof, largest sigs.' },
            ]).map((s) => (
              <OptionCard key={s.id} selected={config.signatureScheme === s.id} title={s.label} desc={s.desc}
                onClick={() => update('cryptography', {
                  signatureScheme: s.id,
                  pqcAlgorithm: s.id === 'classical' ? null : (config.pqcAlgorithm ?? 'ml-dsa'),
                })} />
            ))}
          </div>
        </div>

        {showPqcOptions && (
          <div>
            <label className="label">PQC Algorithm</label>
            <div className="space-y-2">
              {PQC_ALGORITHMS.map((algo) => (
                <div key={algo.id} className="w-full">
                  <OptionCard selected={config.pqcAlgorithm === algo.id}
                    onClick={() => update('cryptography', { pqcAlgorithm: algo.id })}
                    title={algo.label} desc={algo.note}
                    right={<span className="text-xs font-mono text-ink-300 bg-ink-800 px-2 py-0.5 rounded">sig: {algo.sigSize}</span>} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showPqcOptions && (
          <div>
            <label className="label">Validator Signature Scheme</label>
            <div className="grid grid-cols-2 gap-3">
              <OptionCard selected={config.validatorScheme === 'same-as-accounts'}
                onClick={() => update('cryptography', { validatorScheme: 'same-as-accounts' })}
                title="Same as Accounts" desc="Validators use the same scheme as regular accounts — simpler, uniform." />
              <OptionCard selected={config.validatorScheme === 'pqc-native'}
                onClick={() => update('cryptography', { validatorScheme: 'pqc-native' })}
                title="PQC-Native (Validators)"
                desc="Validators always use PQC regardless of account scheme. Recommended for QCB (Whitepaper 10.2)." />
            </div>
          </div>
        )}

        <div>
          <label className="label">Hash Output Width</label>
          <div className="grid grid-cols-2 gap-3">
            {([256, 384] as HashWidth[]).map((w) => (
              <OptionCard key={w} selected={config.hashWidth === w} onClick={() => update('cryptography', { hashWidth: w })}
                title={`${w}-bit (SHA3-${w})`}
                desc={w === 256
                  ? "Currently adequate — Grover's reduces to ~128-bit effective security, still NIST-approved."
                  : "Extra margin against Grover's algorithm. Larger block headers, negligible performance cost."} />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Migration Trigger</label>
          <p className="text-xs text-ink-400 mb-3">Constitutional condition that initiates migration to a new signature scheme (Whitepaper 10.3 / Open Question 16).</p>
          <div className="space-y-2">
            {MIGRATION_TRIGGERS.map((t) => (
              <div key={t.id} className="w-full">
                <OptionCard selected={config.migrationTrigger === t.id}
                  onClick={() => update('cryptography', { migrationTrigger: t.id })}
                  title={t.label} desc={t.note} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-ink-700 bg-ink-900/30">
          <p className="text-xs text-ink-400">
            <span className="text-ink-200 font-medium">Engine status: </span>
            Post-quantum signature support is not yet implemented in the Chain Forge Rust engine. This configuration is
            recorded in the genesis JSON and will govern the cryptographic layer once it's built.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Step: Network ---
function StepNetwork({ config, basics, update }: { config: ChainConfig['network']; basics: ChainConfig['basics']; update: Update }) {
  const suggestedNetworkId = basics.chainId ? `${basics.chainId}-net` : '';

  const DISCOVERY: { id: PeerDiscovery; label: string; desc: string }[] = [
    { id: 'mdns',      label: 'mDNS',      desc: 'Auto-discover peers on the local network. Devnet only — does not work across the internet.' },
    { id: 'bootstrap', label: 'Bootstrap', desc: 'Connect to a fixed list of known nodes below. Required for testnet/mainnet.' },
    { id: 'both',      label: 'Both',      desc: 'mDNS for local peers, bootstrap list for remote. Sensible default.' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Network & P2P</h2>
      <p className="text-sm text-ink-300 mb-6">
        How nodes find and talk to each other. The engine cannot start a node without these.
      </p>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1">
            <label className="label">Network ID</label>
            <input type="text" value={config.networkId}
              onChange={(e) => update('network', { networkId: e.target.value })}
              className="input-mono" placeholder={suggestedNetworkId || 'e.g. qcb-testnet-1-net'} />
            <p className="text-xs text-ink-400 mt-1.5">Distinguishes this P2P network from other chains. Nodes with a different ID refuse to peer.</p>
          </div>
          <div>
            <label className="label">P2P Port</label>
            <input type="number" value={config.p2pPort} min={1024} max={65535}
              onChange={(e) => update('network', { p2pPort: Number(e.target.value) })}
              className="input-mono" />
            <p className="text-xs text-ink-400 mt-1.5">Gossip / block propagation.</p>
          </div>
          <div>
            <label className="label">RPC Port</label>
            <input type="number" value={config.rpcPort} min={1024} max={65535}
              onChange={(e) => update('network', { rpcPort: Number(e.target.value) })}
              className="input-mono" />
            <p className="text-xs text-ink-400 mt-1.5">Explorer / wallet / Merchant API.</p>
          </div>
        </div>

        {config.p2pPort === config.rpcPort && (
          <Warn><span className="text-warn-300 font-medium">Port conflict: </span>P2P and RPC must use different ports.</Warn>
        )}

        <div>
          <label className="label">Peer Discovery</label>
          <div className="grid grid-cols-3 gap-3">
            {DISCOVERY.map((d) => (
              <OptionCard key={d.id} selected={config.peerDiscovery === d.id}
                onClick={() => update('network', { peerDiscovery: d.id })} title={d.label} desc={d.desc} />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Bootstrap Nodes</label>
          <textarea value={config.bootstrapNodes}
            onChange={(e) => update('network', { bootstrapNodes: e.target.value })}
            className="input-mono h-24 resize-none"
            placeholder={"One multiaddr per line, e.g.:\n/ip4/203.0.113.10/tcp/26656/p2p/12D3KooW...\n/dns4/seed1.qcb.network/tcp/26656/p2p/12D3KooW..."} />
          <p className="text-xs text-ink-400 mt-1.5">
            Leave empty for devnet with mDNS. For testnet/mainnet you'll fill these in once your first nodes have peer IDs.
          </p>
        </div>

        <div className="w-1/3">
          <label className="label">Max Peers</label>
          <input type="number" value={config.maxPeers} min={1} max={500}
            onChange={(e) => update('network', { maxPeers: Number(e.target.value) })}
            className="input-mono" />
          <p className="text-xs text-ink-400 mt-1.5">Upper bound on simultaneous connections per node.</p>
        </div>
      </div>
    </div>
  );
}

// --- Step: Limits ---
function StepLimits({ config, crypto, update }: { config: ChainConfig['limits']; crypto: ChainConfig['cryptography']; update: Update }) {
  const pqcAlgo = crypto.signatureScheme !== 'classical' ? crypto.pqcAlgorithm : null;
  const pqcMin = pqcAlgo ? PQC_MIN_TX_BYTES[pqcAlgo] : 0;
  const txTooSmallForPqc = pqcAlgo !== null && config.maxTxBytes < pqcMin;
  const txExceedsBlock = config.maxTxBytes > config.maxBlockBytes;

  const fmtBytes = (n: number) =>
    n >= 1_048_576 ? `${(n / 1_048_576).toFixed(2)} MiB` : n >= 1024 ? `${(n / 1024).toFixed(0)} KiB` : `${n} B`;

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Block & Mempool Limits</h2>
      <p className="text-sm text-ink-300 mb-4">
        Hard caps the engine enforces. These interact directly with your signature scheme choice.
      </p>

      {txTooSmallForPqc && (
        <Warn>
          <span className="text-warn-300 font-medium">Max tx size too small for {pqcAlgo}: </span>
          a single {pqcAlgo} signature needs roughly {fmtBytes(pqcMin)} of headroom, but max tx size is
          {' '}{fmtBytes(config.maxTxBytes)}. Transactions will be rejected. Raise max tx bytes to at least {fmtBytes(pqcMin)}.
        </Warn>
      )}
      {txExceedsBlock && (
        <Warn><span className="text-warn-300 font-medium">Invalid: </span>max tx size cannot exceed max block size.</Warn>
      )}

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label">Max Block Size (bytes)</label>
          <input type="number" value={config.maxBlockBytes} min={1024} step={1024}
            onChange={(e) => update('limits', { maxBlockBytes: Number(e.target.value) })} className="input-mono" />
          <p className="text-xs text-ink-400 mt-1.5">{fmtBytes(config.maxBlockBytes)}. Larger = more txs per block, more bandwidth per node.</p>
        </div>
        <div>
          <label className="label">Max Tx Size (bytes)</label>
          <input type="number" value={config.maxTxBytes} min={256} step={256}
            onChange={(e) => update('limits', { maxTxBytes: Number(e.target.value) })} className="input-mono" />
          <p className="text-xs text-ink-400 mt-1.5">{fmtBytes(config.maxTxBytes)}. Must accommodate your signature scheme.</p>
        </div>
        <div>
          <label className="label">Block Gas Limit</label>
          <input type="number" value={config.blockGasLimit} min={100_000} step={100_000}
            onChange={(e) => update('limits', { blockGasLimit: Number(e.target.value) })} className="input-mono" />
          <p className="text-xs text-ink-400 mt-1.5">Total compute budget per block.</p>
        </div>
        <div>
          <label className="label">Mempool Size (txs)</label>
          <input type="number" value={config.mempoolSize} min={100} step={100}
            onChange={(e) => update('limits', { mempoolSize: Number(e.target.value) })} className="input-mono" />
          <p className="text-xs text-ink-400 mt-1.5">Pending txs held before dropping new ones.</p>
        </div>
        <div>
          <label className="label">Mempool TTL (seconds)</label>
          <input type="number" value={config.mempoolTtlSeconds} min={10} step={10}
            onChange={(e) => update('limits', { mempoolTtlSeconds: Number(e.target.value) })} className="input-mono" />
          <p className="text-xs text-ink-400 mt-1.5">How long an unconfirmed tx stays before eviction.</p>
        </div>
      </div>
    </div>
  );
}

// --- Step: Genesis Accounts ---
function StepAccounts({
  config, basics, consensus, update,
}: {
  config: ChainConfig['genesisAccounts']; basics: ChainConfig['basics']; consensus: ChainConfig['consensus']; update: Update;
}) {
  const accounts = config.accounts;
  const prefix = basics.addressPrefix || 'addr';
  const validatorCount = accounts.filter((a) => a.role === 'validator').length;

  const setAccounts = (next: GenesisAccount[]) => update('genesisAccounts', { accounts: next });
  const patch = (id: string, p: Partial<GenesisAccount>) =>
    setAccounts(accounts.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const remove = (id: string) => setAccounts(accounts.filter((a) => a.id !== id));
  const add = (role: AccountRole) =>
    setAccounts([...accounts, { id: newAccountId(), label: '', address: '', balance: '', role }]);

  const ROLE_LABEL: Record<AccountRole, string> = {
    validator: 'Validator', treasury: 'Treasury', faucet: 'Faucet', user: 'User',
  };

  const totalAllocated = accounts.reduce((sum, a) => {
    const n = Number(a.balance);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
  const maxSupply = Number(basics.maxSupply);
  const overAllocated = Number.isFinite(maxSupply) && maxSupply > 0 && totalAllocated > maxSupply;

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Genesis Accounts</h2>
      <p className="text-sm text-ink-300 mb-4">
        Who holds what at block 0. The engine cannot produce a genesis block without at least one funded account.
        Balances are in the base denom ({basics.tokenDenom || 'denom'}).
      </p>

      {validatorCount < consensus.validatorSetSize && (
        <Warn>
          <span className="text-warn-300 font-medium">Validator shortfall: </span>
          Consensus expects {consensus.validatorSetSize} validators but only {validatorCount} validator account{validatorCount === 1 ? '' : 's'} defined.
          The chain can still start with fewer, but the set size in the Consensus step won't be reached at genesis.
        </Warn>
      )}
      {overAllocated && (
        <Warn>
          <span className="text-warn-300 font-medium">Over-allocated: </span>
          genesis balances total {totalAllocated.toLocaleString()} but max supply is {maxSupply.toLocaleString()}.
        </Warn>
      )}

      <div className="space-y-3 mb-4">
        {accounts.map((a) => (
          <div key={a.id} className="p-4 rounded-lg border border-ink-600 bg-ink-900/50">
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <label className="label">Label</label>
                <input type="text" value={a.label} onChange={(e) => patch(a.id, { label: e.target.value })}
                  className="input-field" placeholder="e.g. Validator 1" />
              </div>
              <div className="col-span-2">
                <label className="label">Role</label>
                <select value={a.role} onChange={(e) => patch(a.id, { role: e.target.value as AccountRole })}
                  className="input-field">
                  {(Object.keys(ROLE_LABEL) as AccountRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <label className="label">Address</label>
                <input type="text" value={a.address} onChange={(e) => patch(a.id, { address: e.target.value })}
                  className="input-mono" placeholder={`${prefix}1...`} />
              </div>
              <div className="col-span-2">
                <label className="label">Balance</label>
                <input type="text" inputMode="numeric" value={a.balance}
                  onChange={(e) => patch(a.id, { balance: e.target.value.replace(/[^0-9]/g, '') })}
                  className="input-mono" placeholder="0" />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => remove(a.id)} className="btn-ghost p-2" title="Remove account"
                  disabled={accounts.length === 1}>
                  <Trash2 size={16} className={accounts.length === 1 ? 'text-ink-600' : 'text-danger-400'} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(ROLE_LABEL) as AccountRole[]).map((r) => (
          <button key={r} onClick={() => add(r)} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Plus size={14} /> Add {ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="p-3 rounded-lg border border-ink-700 bg-ink-900/30 flex items-center justify-between">
        <span className="text-xs text-ink-400">Total allocated at genesis</span>
        <span className="text-sm font-mono text-white">
          {totalAllocated.toLocaleString()} {basics.tokenDenom || ''}
          {Number.isFinite(maxSupply) && maxSupply > 0 && (
            <span className="text-ink-400"> / {maxSupply.toLocaleString()}</span>
          )}
        </span>
      </div>

      <p className="text-xs text-ink-400 mt-3">
        Validator addresses here are their <em>account</em> addresses (where staking rewards land). Validator consensus keys
        are generated separately by the engine at first boot and are not part of this step.
      </p>
    </div>
  );
}

// --- Step: Review & Generate ---
function StepGenerate({
  genesisJson, config, saving, saveError, generated, generateStatus, onGenerate,
}: {
  genesisJson: Record<string, unknown>; config: ChainConfig; saving: boolean; saveError: string | null;
  generated: Chain | null; generateStatus: 'ready' | 'coming-soon'; onGenerate: () => void;
}) {
  if (generated) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center justify-center">
            <Check size={24} className="text-success-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Chain Configuration Saved</h2>
            <p className="text-sm text-ink-300">Your chain "{config.basics.chainName}" has been saved to the dashboard.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-4"><p className="text-xs text-ink-400 mb-1">Chain ID</p><p className="text-sm font-mono text-white">{config.basics.chainId}</p></div>
          <div className="card p-4"><p className="text-xs text-ink-400 mb-1">Token</p><p className="text-sm font-mono text-white">{config.basics.tokenSymbol}</p></div>
          <div className="card p-4"><p className="text-xs text-ink-400 mb-1">Accounts</p><p className="text-sm font-mono text-white">{config.genesisAccounts.accounts.length} at genesis</p></div>
        </div>
        <label className="label">Genesis JSON Preview</label>
        <JsonViewer data={genesisJson} />
      </div>
    );
  }

  const crypto = config.cryptography;
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between"><span className="text-ink-400">{k}</span><span className="text-white font-mono">{v}</span></div>
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Review & Generate</h2>
      <p className="text-sm text-ink-300 mb-6">Review your configuration and generate the genesis file.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Basics & Environment</p>
          <div className="space-y-1 text-sm">
            <Row k="Name" v={config.basics.chainName} />
            <Row k="Chain ID" v={config.basics.chainId} />
            <Row k="Token" v={`${config.basics.tokenSymbol} (${config.basics.tokenDenom})`} />
            <Row k="Prefix" v={config.basics.addressPrefix} />
            {config.basics.maxSupply && <Row k="Max Supply" v={config.basics.maxSupply} />}
            <Row k="Mode" v={config.environment.mode} />
            <Row k="Faucet" v={config.environment.faucetEnabled ? 'on' : 'off'} />
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Consensus & Execution</p>
          <div className="space-y-1 text-sm">
            <Row k="Mechanism" v={config.consensus.mechanism.toUpperCase()} />
            <Row k="Validators" v={config.consensus.validatorSetSize} />
            <Row k="Block Time" v={`${config.consensus.blockTimeMs}ms`} />
            <Row k="State Model" v={config.execution.stateModel} />
            <Row k="Parallel" v={config.execution.parallelExecution ? 'Yes' : 'No'} />
            <Row k="Gas Model" v={config.execution.gasModel} />
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Cryptography</p>
          <div className="space-y-1 text-sm">
            <Row k="Scheme" v={crypto.signatureScheme} />
            {crypto.pqcAlgorithm && <Row k="PQC Algo" v={crypto.pqcAlgorithm} />}
            <Row k="Validator Keys" v={crypto.validatorScheme} />
            <Row k="Hash Width" v={`${crypto.hashWidth}-bit`} />
            <Row k="Migration" v={crypto.migrationTrigger} />
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Network & Limits</p>
          <div className="space-y-1 text-sm">
            <Row k="Network ID" v={config.network.networkId} />
            <Row k="P2P / RPC" v={`${config.network.p2pPort} / ${config.network.rpcPort}`} />
            <Row k="Discovery" v={config.network.peerDiscovery} />
            <Row k="Max Peers" v={config.network.maxPeers} />
            <Row k="Block / Tx" v={`${(config.limits.maxBlockBytes / 1024).toFixed(0)}K / ${(config.limits.maxTxBytes / 1024).toFixed(0)}K`} />
            <Row k="Gas Limit" v={config.limits.blockGasLimit.toLocaleString()} />
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">
          Genesis Accounts ({config.genesisAccounts.accounts.length})
        </p>
        <div className="space-y-1 text-sm">
          {config.genesisAccounts.accounts.map((a) => (
            <div key={a.id} className="flex justify-between gap-3">
              <span className="text-ink-400 truncate">
                <span className="badge badge-draft font-mono mr-2">{a.role}</span>{a.label || '(unlabeled)'}
              </span>
              <span className="text-white font-mono shrink-0">{Number(a.balance).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-6">
        <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Selected Modules ({config.modules.selected.length})</p>
        <div className="flex flex-wrap gap-2">
          {config.modules.selected.map((m) => <span key={m} className="badge badge-draft font-mono">{m}</span>)}
        </div>
        {config.modules.customModule.trim() && (
          <div className="mt-3 pt-3 border-t border-ink-700/50">
            <p className="text-xs text-ink-400 mb-1">Custom Modules</p>
            <p className="text-xs font-mono text-ink-200 whitespace-pre-line">{config.modules.customModule}</p>
          </div>
        )}
      </div>

      <label className="label">Genesis JSON Preview</label>
      <JsonViewer data={genesisJson} className="mb-6" />

      {saveError && (
        <div className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2 mb-4">{saveError}</div>
      )}

      {generateStatus === 'coming-soon' && (
        <div className="card p-4 mb-4 border-warn-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-warn-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-ink-200 font-medium">Build API not yet live</p>
              <p className="text-xs text-ink-400 mt-1">
                "Generate Genesis" saves your configuration to the dashboard. The Rust engine's build endpoint is
                still being wired up — once online, your saved chain can be compiled without re-entering anything.
              </p>
            </div>
          </div>
        </div>
      )}

      <button onClick={onGenerate} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <FileJson size={16} />}
        {saving ? 'Saving Configuration...' : 'Generate Genesis'}
      </button>
    </div>
  );
}