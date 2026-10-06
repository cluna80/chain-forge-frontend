import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ENGINE_MODULES, ENGINE_VERSION, SERVICE_URL } from '@/lib/engineData';
import type {
  ChainConfig, Chain, SignatureScheme, PqcAlgorithm, MigrationTrigger, HashWidth,
  EnvironmentMode, PeerDiscovery, AccountRole, GenesisAccount, LocalChain,
} from '@/types';
import { JsonViewer } from '@/components/JsonViewer';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
  Settings, Cpu, Layers, Boxes, FileJson, X, Shield,
  Globe, Network, Gauge, Users, Plus, Trash2, Play, Square, Save,
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
  { id: 'generate',     label: 'Launch',      icon: FileJson },
];

const newAccountId = () => `acct_${Math.random().toString(36).slice(2, 10)}`;

// ── QCB Chain template ────────────────────────────────────────────────────────
// One-click fill with QCB's exact production settings.
// Matches qcb-genesis.json and the whitepaper v0.3.0.
const QCB_TEMPLATE: Partial<ChainConfig> = {
  basics: {
    chainName:     'QCB Chain',
    chainId:       'qcb-1',
    tokenName:     'QuarkCharmBit',
    tokenSymbol:   'QCB',
    tokenDenom:    'uqcb',
    addressPrefix: 'qcb1',
    maxSupply:     '210000000',
  },
  environment: {
    mode:          'testnet' as const,
    faucetEnabled: false,   // no faucet on QCB — balances come from genesis allocation
    relaxedLimits: false,   // strict limits from day one
  },
  consensus: {
    mechanism:          'pos' as const,
    validatorSetSize:   4,
    blockTimeMs:        3500,
    personhoodWeighted: true,
  },
  execution: {
    stateModel:        'account' as const,
    parallelExecution: false,
    gasModel:          'dynamic' as const,
    requireSignatures: true,
  },
  modules: {
    selected:     ['bank', 'staking', 'identity', 'cirfi', 'agents'],
    customModule: '',
  },
  cryptography: {
    signatureScheme:  'classical' as const,
    pqcAlgorithm:     null,
    migrationTrigger: 'nist-guidance' as const,
    hashWidth:        256 as const,
    validatorScheme:  'same-as-accounts' as const,
  },
  genesisAccounts: {
    accounts: [
      { id: 'qcb-val-alice',  label: 'Alice (qcb1alice)',  address: 'qcb1alice',  balance: '10000000000', role: 'validator'  as const },
      { id: 'qcb-val-bob',    label: 'Bob (qcb1bob)',      address: 'qcb1bob',    balance: '10000000000', role: 'validator'  as const },
      { id: 'qcb-val-carol',  label: 'Carol (qcb1carol)',  address: 'qcb1carol',  balance: '10000000000', role: 'validator'  as const },
      { id: 'qcb-val-dave',   label: 'Dave (qcb1dave)',    address: 'qcb1dave',   balance: '10000000000', role: 'validator'  as const },
      { id: 'qcb-treasury',   label: 'Treasury',           address: '',           balance: '50000000000', role: 'treasury'   as const },
    ],
  },
  network: {
    networkId:      'qcb-1-net',
    p2pPort:        26656,
    rpcPort:        26657,
    maxPeers:       50,
    peerDiscovery:  'both' as const,
    // Testnet VM IPs — update these if your VM addresses change
    bootstrapNodes: '/ip4/10.0.0.90/tcp/26656\n/ip4/10.0.0.12/tcp/26656\n/ip4/10.0.0.181/tcp/26656\n/ip4/10.0.0.54/tcp/26656',
  },
};

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
    mode: 'devnet',
    faucetEnabled: true,
    relaxedLimits: true,
  },
  consensus: {
    mechanism: 'pos',
    validatorSetSize: 4,
    blockTimeMs: 1000,
    personhoodWeighted: false,
  },
  execution: {
    stateModel: 'account',
    parallelExecution: false,
    gasModel: 'dynamic',
    requireSignatures: true,
  },
  modules: {
    selected: ['bank', 'staking'],
    customModule: '',
  },
  cryptography: {
    signatureScheme: 'classical',
    pqcAlgorithm: null,
    migrationTrigger: 'nist-guidance',
    hashWidth: 256,
    validatorScheme: 'same-as-accounts',
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
    maxTxBytes: 65_536,         // 64 KiB
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

/**
 * Everything the engine would refuse, checked here first so a developer sees
 * the problem before launching. Mirrors chain-forge-core enabled_modules()
 * and chain-forge-service prepare_local_chain().
 */
function configProblems(config: ChainConfig): string[] {
  const problems: string[] = [];
  const mods = config.modules.selected;
  const known = ENGINE_MODULES.map((m) => m.id);

  for (const m of mods) {
    if (!known.includes(m)) problems.push(`Module "${m}" is not supported by the engine.`);
  }
  for (const mod of ENGINE_MODULES) {
    if (mods.includes(mod.id)) {
      for (const dep of mod.requires ?? []) {
        if (!mods.includes(dep)) problems.push(`${mod.name} requires the ${dep} module.`);
      }
    }
  }
  if (config.consensus.personhoodWeighted && !mods.includes('identity')) {
    problems.push('Personhood-weighted consensus requires the identity module.');
  }
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(config.basics.chainId) || ['.', '..'].includes(config.basics.chainId)) {
    problems.push('Chain ID must be 1–64 characters of letters, digits, "-", "_" or ".".');
  }
  const accts = config.genesisAccounts.accounts;
  if (!accts.some((a) => a.role === 'validator')) {
    problems.push('At least one genesis account must be a validator.');
  }
  const typed = accts.map((a) => a.address.trim()).filter(Boolean);
  const dup = typed.find((a, i) => typed.indexOf(a) !== i);
  if (dup) problems.push(`Address "${dup}" is used by more than one account.`);
  return problems;
}

export function Wizard({ onDone, onCancel }: WizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<ChainConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Chain | null>(null);
  const [launched, setLaunched] = useState<LocalChain | null>(null);

  /** Fill all wizard fields with QCB's production settings. */
  const applyQcbTemplate = () => {
    setConfig(prev => ({
      ...prev,
      basics:         { ...prev.basics,         ...QCB_TEMPLATE.basics         },
      environment:    { ...prev.environment,    ...QCB_TEMPLATE.environment    },
      consensus:      { ...prev.consensus,      ...QCB_TEMPLATE.consensus      },
      execution:      { ...prev.execution,      ...QCB_TEMPLATE.execution      },
      modules:        { ...prev.modules,        ...QCB_TEMPLATE.modules        },
      cryptography:   { ...prev.cryptography,   ...QCB_TEMPLATE.cryptography   },
      network:        { ...prev.network,        ...QCB_TEMPLATE.network        },
      // replace accounts with QCB's validator set
      genesisAccounts: QCB_TEMPLATE.genesisAccounts ?? prev.genesisAccounts,
    }));
    setStep(0);
  };

  const updateConfig = <K extends keyof ChainConfig>(key: K, value: Partial<ChainConfig[K]>) => {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }));
  };

  const problems = useMemo(() => configProblems(config), [config]);

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
        // Addresses may be blank: the service generates a key and derives one.
        const accts = config.genesisAccounts.accounts;
        return accts.length > 0 && accts.every((a) => a.balance.trim() !== '');
      }
      default:
        return true;
    }
  }, [step, config]);

  const genesisJson = useMemo(() => {
    const crypto = config.cryptography;
    // bank is always on; keep it first and never duplicated.
    const modules = ['bank', ...config.modules.selected.filter((m) => m !== 'bank')];
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
        personhood_weighted: config.consensus.personhoodWeighted,
      },
      execution: {
        state_model: config.execution.stateModel,
        parallel_execution: config.execution.parallelExecution,
        gas_model: config.execution.gasModel,
        require_signatures: config.execution.requireSignatures,
      },
      modules,
      custom_modules: [],
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
        label, address: address.trim(), balance, role,
      })),
      genesis_time: new Date().toISOString(),
    };
  }, [config]);

  /** Save to the dashboard (Supabase). Only public data: never private keys. */
  const saveChain = async (
    status: Chain['status'], genesis: Record<string, unknown>, logs: string,
    nodeStatus: Record<string, unknown> | null,
  ): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase
      .from('chains')
      .insert({
        name: config.basics.chainName,
        chain_id: config.basics.chainId,
        status,
        engine_version: ENGINE_VERSION,
        config,
        genesis_json: genesis,
        build_logs: logs,
        node_status: nodeStatus,
        explorer_url: null,
        repo_url: null,
      })
      .select()
      .single();
    if (error) {
      setSaveError(`Saved nothing to the dashboard: ${error.message}`);
      return false;
    }
    setGenerated(data as Chain);
    return true;
  };

  const handleLaunch = async () => {
    setSaving(true);
    setSaveError(null);

    let chain: LocalChain;
    try {
      const res = await fetch(`${SERVICE_URL}/api/chains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genesisJson),
      });
      const body = await res.json();
      if (!res.ok) {
        setSaveError(body?.error ?? `The Chain Forge service returned HTTP ${res.status}.`);
        setSaving(false);
        return;
      }
      chain = body as LocalChain;
    } catch {
      setSaveError(
        'Could not reach the Chain Forge service at ' + SERVICE_URL + '. Start it with ' +
        '.\\target\\release\\chain-forge-service.exe in C:\\Dev\\chain-forge-engine, then try again. ' +
        'Or use "Save draft only".',
      );
      setSaving(false);
      return;
    }

    setLaunched(chain);
    // The genesis as actually run: generated addresses and PUBLIC keys filled in.
    await saveChain('running', chain.genesis ?? genesisJson,
      `Launched locally: ${chain.nodes.length} validator node(s). Files in ${chain.dir}`,
      { service_url: SERVICE_URL, chain_id: chain.chain_id, nodes: chain.nodes.map((n) => ({ validator: n.validator, api_url: n.api_url })) });
    setSaving(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    await saveChain('draft', genesisJson, 'Saved as a draft. Not launched.', null);
    setSaving(false);
  };

  const currentId = STEPS[step].id;
  const done = generated !== null || launched !== null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Chain</h1>
          <p className="text-sm text-ink-300 mt-1">
            Configure a blockchain on the Chain Forge engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={applyQcbTemplate}
            className="flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
            title="Fill all fields with QCB Chain's production settings"
          >
            <Cpu size={12} />
            QCB Template
          </button>
          <button onClick={onCancel} className="btn-ghost flex items-center gap-2">
            <X size={16} />
            Cancel
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="relative mb-10">
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;
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
        {currentId === 'consensus'    && <StepConsensus    config={config.consensus}    modules={config.modules} update={updateConfig} />}
        {currentId === 'execution'    && <StepExecution    config={config.execution}    update={updateConfig} />}
        {currentId === 'modules'      && <StepModules      config={config.modules}      consensus={config.consensus} update={updateConfig} />}
        {currentId === 'cryptography' && <StepCryptography config={config.cryptography} update={updateConfig} />}
        {currentId === 'network'      && <StepNetwork      config={config.network}      basics={config.basics} update={updateConfig} />}
        {currentId === 'limits'       && <StepLimits       config={config.limits}       crypto={config.cryptography} update={updateConfig} />}
        {currentId === 'accounts'     && <StepAccounts     config={config.genesisAccounts} basics={config.basics} consensus={config.consensus} update={updateConfig} />}
        {currentId === 'generate' && (
          <StepGenerate
            genesisJson={genesisJson}
            config={config}
            problems={problems}
            saving={saving}
            saveError={saveError}
            generated={generated}
            launched={launched}
            onLaunch={handleLaunch}
            onSaveDraft={handleSaveDraft}
          />
        )}
      </div>

      {/* Navigation */}
      {!done && (
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

      {done && (
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

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-forge-500' : 'bg-ink-600'} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
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

/** Small tag for options the engine records in genesis but does not act on yet. */
function NotYet() {
  return <span className="text-[10px] text-ink-500 italic">not yet supported</span>;
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
          <p className="text-xs text-ink-400 mt-1.5">Letters, digits, "-", "_" and "." only. It also names the chain's folder.</p>
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
    { id: 'devnet',  label: 'Devnet',  desc: 'Local development on this machine. Faucet on, limits relaxed, throwaway state.' },
    { id: 'testnet', label: 'Testnet', desc: 'Multi-node test network. Faucet on, real consensus, no real value.' },
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
            <span className="text-warn-300 font-medium">Not ready for real value yet. </span>
            The engine runs, but state is kept in memory only (a restarted node starts over from genesis),
            consensus votes are not yet signed, and the code has not had a security audit. See Engine Status.
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
function StepConsensus({
  config, modules, update,
}: { config: ChainConfig['consensus']; modules: ChainConfig['modules']; update: Update }) {
  const togglePersonhood = () => {
    const on = !config.personhoodWeighted;
    update('consensus', { personhoodWeighted: on });
    // Personhood needs an identity layer: switching it on selects identity.
    if (on && !modules.selected.includes('identity')) {
      update('modules', { selected: [...modules.selected, 'identity'] });
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Consensus</h2>
      <p className="text-sm text-ink-300 mb-6">
        Byzantine-fault-tolerant consensus: blocks are final once more than two-thirds of validator power agrees.
      </p>

      <div className="space-y-5">
        <div>
          <label className="label">Consensus Mechanism</label>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard selected={config.mechanism === 'pos'} onClick={() => update('consensus', { mechanism: 'pos' })}
              title="Proof of Stake"
              desc="Validators secure the chain with staked tokens." />
            <OptionCard selected={config.mechanism === 'poa'} onClick={() => update('consensus', { mechanism: 'poa' })}
              title="Proof of Authority"
              desc="A fixed set of known validators. Currently runs the same BFT engine as Proof of Stake."
              right={<NotYet />} />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-ink-600 bg-ink-900/50">
          <div>
            <div className="text-sm font-medium text-white">Personhood-Weighted Voting Power</div>
            <div className="text-xs text-ink-400 mt-0.5">
              Cap each validator's voting power per verified human, so no one can buy control with money alone.
              Requires the Identity module, which is selected automatically. QCB uses this.
            </div>
          </div>
          <Toggle on={config.personhoodWeighted} onClick={togglePersonhood} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label">Validator Set Size</label>
            <input type="number" value={config.validatorSetSize} min={1} max={200}
              onChange={(e) => update('consensus', { validatorSetSize: Number(e.target.value) })}
              className="input-mono" />
            <p className="text-xs text-ink-400 mt-1.5">
              Testnet: 4–10. Tolerates up to one-third of validators failing, so 4 is the smallest fault-tolerant set.
            </p>
          </div>
          <div>
            <label className="label">Block Time (ms)</label>
            <input type="number" value={config.blockTimeMs} min={500} max={30000} step={500}
              onChange={(e) => update('consensus', { blockTimeMs: Number(e.target.value) })}
              className="input-mono" />
            <p className="text-xs text-ink-400 mt-1.5">1000ms = 1s blocks. Lower = faster but harder on validators.</p>
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
      <p className="text-sm text-ink-300 mb-6">State model, gas metering, and transaction rules.</p>

      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 rounded-lg border border-ink-600 bg-ink-900/50">
          <div>
            <div className="text-sm font-medium text-white">Require Signed Transactions</div>
            <div className="text-xs text-ink-400 mt-0.5">
              Every transaction must be signed by the key bound to its sender. Leave this on.
            </div>
          </div>
          <Toggle on={config.requireSignatures} onClick={() => update('execution', { requireSignatures: !config.requireSignatures })} />
        </div>
        {!config.requireSignatures && (
          <Warn>
            <span className="text-warn-300 font-medium">Anyone can spend anyone's funds. </span>
            With signatures off, a transaction claiming to come from any account is accepted. Only for throwaway local testing.
          </Warn>
        )}

        <div>
          <label className="label">State Model</label>
          <div className="grid grid-cols-3 gap-3">
            {(['account', 'utxo', 'hybrid'] as const).map((m) => (
              <OptionCard key={m} selected={config.stateModel === m}
                disabled={m !== 'account'}
                onClick={() => m === 'account' && update('execution', { stateModel: m })}
                title={m.charAt(0).toUpperCase() + m.slice(1)}
                desc={m === 'account' ? 'Ethereum-style account balances' : m === 'utxo' ? 'Bitcoin-style unspent outputs' : 'Mixed model'}
                right={m !== 'account' ? <NotYet /> : null} />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Gas Model</label>
          <div className="grid grid-cols-3 gap-3">
            {(['fixed', 'dynamic', 'eip-1559-style'] as const).map((m) => (
              <OptionCard key={m} selected={config.gasModel === m} onClick={() => update('execution', { gasModel: m })}
                title={m === 'eip-1559-style' ? 'EIP-1559 Style' : m.charAt(0).toUpperCase() + m.slice(1)}
                desc={m === 'fixed' ? 'Flat fee per tx' : m === 'dynamic' ? 'Fee scales with size and operation' : 'Base fee plus priority tip'} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-ink-600 bg-ink-900/50 opacity-60">
          <div>
            <div className="text-sm font-medium text-white flex items-center gap-2">Parallel Execution <NotYet /></div>
            <div className="text-xs text-ink-400 mt-0.5">Execute non-conflicting transactions concurrently.</div>
          </div>
          <Toggle on={false} onClick={() => {}} disabled />
        </div>
      </div>
    </div>
  );
}

// --- Step: Modules ---
function StepModules({
  config, consensus, update,
}: { config: ChainConfig['modules']; consensus: ChainConfig['consensus']; update: Update }) {
  const byId = Object.fromEntries(ENGINE_MODULES.map((m) => [m.id, m]));

  const toggleModule = (id: string) => {
    const mod = byId[id];
    if (!mod || mod.required) return;
    if (config.selected.includes(id)) {
      // Deselecting also removes everything that depends on it.
      const dependents = ENGINE_MODULES.filter((m) => m.requires?.includes(id)).map((m) => m.id);
      const selected = config.selected.filter((m) => m !== id && !dependents.includes(m));
      update('modules', { selected });
      if (id === 'identity' && consensus.personhoodWeighted) {
        update('consensus', { personhoodWeighted: false });
      }
    } else {
      // Selecting also selects what it depends on.
      const selected = Array.from(new Set([...config.selected, id, ...(mod.requires ?? [])]));
      update('modules', { selected });
    }
  };

  const isOn = (id: string) => byId[id]?.required || config.selected.includes(id);

  const grouped = ENGINE_MODULES.reduce<Record<string, typeof ENGINE_MODULES>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Engine Modules</h2>
      <p className="text-sm text-ink-300 mb-6">
        Choose what your chain can do. The engine refuses any module it doesn't implement, so only real ones are listed.
      </p>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, mods]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">{category}</h3>
            <div className="grid grid-cols-2 gap-3">
              {mods.map((mod) => (
                <OptionCard key={mod.id} disabled={!mod.available}
                  selected={isOn(mod.id)}
                  onClick={() => toggleModule(mod.id)}
                  title={mod.name}
                  desc={mod.requires?.length ? `${mod.description} Requires: ${mod.requires.join(', ')}.` : mod.description}
                  right={
                    mod.required
                      ? <span className="text-[10px] text-ink-400 italic">always on</span>
                      : isOn(mod.id) ? <Check size={16} className="text-forge-400" /> : null
                  } />
              ))}
            </div>
          </div>
        ))}

        {consensus.personhoodWeighted && (
          <p className="text-xs text-ink-400">
            Identity is also needed by personhood-weighted consensus (Consensus step). Deselecting it turns that off too.
          </p>
        )}

        <div className="p-3 rounded-lg border border-ink-700 bg-ink-900/30">
          <p className="text-xs text-ink-400">
            <span className="text-ink-200 font-medium">Custom modules: </span>
            not supported yet. The engine refuses a genesis that lists one, rather than silently ignoring it.
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
        Signature scheme, hash width, and the plan for moving to post-quantum signatures.
      </p>

      <Warn>
        <span className="text-warn-300 font-medium">What the engine does today: </span>
        transactions are signed with Ed25519 (classical) whatever you choose here. Hybrid and post-quantum
        choices are recorded in the genesis as your chain's migration plan, but are not enforced yet.
      </Warn>

      <div className="space-y-6">
        <div>
          <label className="label">Signature Scheme</label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: 'classical' as SignatureScheme,  label: 'Classical',  desc: 'Ed25519. What the engine runs today.' },
              { id: 'hybrid' as SignatureScheme,     label: 'Hybrid',     desc: 'Classical + post-quantum in parallel. Recorded, not enforced yet.' },
              { id: 'pqc-native' as SignatureScheme, label: 'PQC-Native', desc: 'Post-quantum only. Recorded, not enforced yet.' },
            ]).map((s) => (
              <OptionCard key={s.id} selected={config.signatureScheme === s.id} title={s.label} desc={s.desc}
                right={s.id !== 'classical' ? <NotYet /> : null}
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
                desc="Validators always use PQC regardless of account scheme." />
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
          <p className="text-xs text-ink-400 mb-3">The condition that starts migration to a new signature scheme.</p>
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
      </div>
    </div>
  );
}

// --- Step: Network ---
function StepNetwork({ config, basics, update }: { config: ChainConfig['network']; basics: ChainConfig['basics']; update: Update }) {
  const suggestedNetworkId = basics.chainId ? `${basics.chainId}-net` : '';

  const DISCOVERY: { id: PeerDiscovery; label: string; desc: string }[] = [
    { id: 'mdns',      label: 'mDNS',      desc: 'Auto-discover peers on the local network. Does not work across the internet.' },
    { id: 'bootstrap', label: 'Bootstrap', desc: 'Connect to a fixed list of known nodes below. Required for testnet/mainnet.' },
    { id: 'both',      label: 'Both',      desc: 'mDNS for local peers, bootstrap list for remote. Sensible default.' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Network & P2P</h2>
      <p className="text-sm text-ink-300 mb-6">
        How nodes find and talk to each other on a real multi-machine network. When you launch locally,
        Chain Forge picks free ports and connects your validators to each other automatically.
      </p>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1">
            <label className="label">Network ID</label>
            <input type="text" value={config.networkId}
              onChange={(e) => update('network', { networkId: e.target.value })}
              className="input-mono" placeholder={suggestedNetworkId || 'e.g. qcb-testnet-1-net'} />
            <p className="text-xs text-ink-400 mt-1.5">Distinguishes this P2P network from other chains.</p>
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
            placeholder={"One multiaddr per line, e.g.:\n/ip4/203.0.113.10/tcp/26656\n/ip4/203.0.113.11/tcp/26656"} />
          <p className="text-xs text-ink-400 mt-1.5">
            Leave empty for a local launch. For a network across machines, list each validator's address.
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
        Hard caps the engine enforces.
      </p>

      {txTooSmallForPqc && (
        <Warn>
          <span className="text-warn-300 font-medium">Max tx size too small for {pqcAlgo}: </span>
          once post-quantum signatures are enforced, a single {pqcAlgo} signature needs roughly {fmtBytes(pqcMin)} of
          headroom, but max tx size is {fmtBytes(config.maxTxBytes)}. Raise it to at least {fmtBytes(pqcMin)}.
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
        Who holds what at block 0. Balances are in the base denom ({basics.tokenDenom || 'denom'}).
        Each validator account runs one node when you launch.
      </p>

      {validatorCount < consensus.validatorSetSize && (
        <Warn>
          <span className="text-warn-300 font-medium">Validator shortfall: </span>
          Consensus expects {consensus.validatorSetSize} validators but only {validatorCount} validator account{validatorCount === 1 ? '' : 's'} defined.
          The chain will run with {validatorCount}. Fewer than 4 validators means it cannot survive one failing.
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
                  className="input-mono" placeholder="blank = generate" />
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
        Keys are generated on this machine by the Chain Forge service when you launch, one per account.
        Leave an address blank and it's derived from the new key ({prefix}1…); type one and the new key is bound to it.
        Private keys stay in the chain's folder on this machine and are never sent to this page or the dashboard.
      </p>
    </div>
  );
}

// --- Step: Review & Launch ---
function StepGenerate({
  genesisJson, config, problems, saving, saveError, generated, launched, onLaunch, onSaveDraft,
}: {
  genesisJson: Record<string, unknown>; config: ChainConfig; problems: string[]; saving: boolean;
  saveError: string | null; generated: Chain | null; launched: LocalChain | null;
  onLaunch: () => void; onSaveDraft: () => void;
}) {
  if (launched) return <LaunchedChain initial={launched} />;

  if (generated) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center justify-center">
            <Check size={24} className="text-success-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Draft Saved</h2>
            <p className="text-sm text-ink-300">"{config.basics.chainName}" is saved to the dashboard. It isn't running.</p>
          </div>
        </div>
        <label className="label">Genesis JSON</label>
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
      <h2 className="text-lg font-semibold text-white mb-1">Review & Launch</h2>
      <p className="text-sm text-ink-300 mb-6">
        Launch runs your chain on this machine: one node per validator, keys generated locally.
      </p>

      {problems.length > 0 && (
        <div className="mb-6 p-3 rounded-lg border border-danger-500/30 bg-danger-500/5">
          <p className="text-sm text-danger-400 font-medium mb-1">Fix these before launching</p>
          <ul className="text-xs text-ink-300 list-disc pl-5 space-y-0.5">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

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
            <Row k="Personhood" v={config.consensus.personhoodWeighted ? 'weighted' : 'off'} />
            <Row k="Validators" v={config.consensus.validatorSetSize} />
            <Row k="Block Time" v={`${config.consensus.blockTimeMs}ms`} />
            <Row k="Signatures" v={config.execution.requireSignatures ? 'required' : 'OFF'} />
            <Row k="Gas Model" v={config.execution.gasModel} />
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Cryptography</p>
          <div className="space-y-1 text-sm">
            <Row k="Scheme" v={crypto.signatureScheme} />
            {crypto.pqcAlgorithm && <Row k="PQC Algo" v={crypto.pqcAlgorithm} />}
            <Row k="Hash Width" v={`${crypto.hashWidth}-bit`} />
            <Row k="Migration" v={crypto.migrationTrigger} />
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Network & Limits</p>
          <div className="space-y-1 text-sm">
            <Row k="Network ID" v={config.network.networkId} />
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
                <span className="font-mono text-ink-500 ml-2">{a.address || '(generated)'}</span>
              </span>
              <span className="text-white font-mono shrink-0">{Number(a.balance).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-6">
        <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Modules</p>
        <div className="flex flex-wrap gap-2">
          {(genesisJson.modules as string[]).map((m) => <span key={m} className="badge badge-draft font-mono">{m}</span>)}
        </div>
      </div>

      <label className="label">Genesis JSON Preview</label>
      <JsonViewer data={genesisJson} className="mb-6" />

      {saveError && (
        <div className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2 mb-4">{saveError}</div>
      )}

      <div className="flex gap-3">
        <button onClick={onLaunch} disabled={saving || problems.length > 0}
          className="btn-primary flex-1 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {saving ? 'Working...' : 'Launch Local Chain'}
        </button>
        <button onClick={onSaveDraft} disabled={saving}
          className="btn-secondary flex items-center justify-center gap-2">
          <Save size={16} />
          Save Draft Only
        </button>
      </div>
      <p className="text-xs text-ink-400 mt-2">
        Launching needs the Chain Forge service running on this machine ({SERVICE_URL}).
      </p>
    </div>
  );
}

/** A launched local chain: live status from each node, refreshed every 2 seconds. */
function LaunchedChain({ initial }: { initial: LocalChain }) {
  const [chain, setChain] = useState<LocalChain>(initial);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stopped) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${SERVICE_URL}/api/chains/${encodeURIComponent(initial.chain_id)}`);
        if (res.ok) { setChain(await res.json()); setError(null); }
        else if (res.status === 404) { setStopped(true); }
      } catch {
        setError('Lost contact with the Chain Forge service.');
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [initial.chain_id, stopped]);

  const stop = async () => {
    try {
      await fetch(`${SERVICE_URL}/api/chains/${encodeURIComponent(initial.chain_id)}/stop`, { method: 'POST' });
      setStopped(true);
    } catch {
      setError('Could not reach the Chain Forge service to stop the chain.');
    }
  };

  const allUp = chain.nodes.length > 0 && chain.nodes.every((n) => n.status.running && (n.status.height ?? 0) > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
            stopped ? 'bg-ink-800 border-ink-600' : 'bg-success-500/10 border-success-500/20'}`}>
            {stopped ? <Square size={22} className="text-ink-400" /> : <Play size={22} className="text-success-400" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {stopped ? 'Chain Stopped' : allUp ? 'Chain Running' : 'Starting Nodes...'}
            </h2>
            <p className="text-sm text-ink-300 font-mono">{chain.chain_id}</p>
          </div>
        </div>
        {!stopped && (
          <button onClick={stop} className="btn-secondary flex items-center gap-2">
            <Square size={14} /> Stop Chain
          </button>
        )}
      </div>

      {error && <Warn>{error}</Warn>}

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-12 text-xs text-ink-400 uppercase tracking-wider mb-2">
          <span className="col-span-5">Validator</span>
          <span className="col-span-2">State</span>
          <span className="col-span-2 text-right">Height</span>
          <span className="col-span-1 text-right">Peers</span>
          <span className="col-span-2 text-right">API</span>
        </div>
        {chain.nodes.map((n) => (
          <div key={n.validator} className="grid grid-cols-12 text-sm py-1 border-t border-ink-700/50">
            <span className="col-span-5 font-mono text-white truncate">{n.validator}</span>
            <span className={`col-span-2 ${n.status.running ? 'text-success-400' : 'text-danger-400'}`}>
              {stopped ? 'stopped' : !n.status.running ? `exited (${n.status.exit_code ?? '?'})` : n.status.api === 'starting' ? 'starting' : 'running'}
            </span>
            <span className="col-span-2 text-right font-mono text-white">{n.status.height ?? '—'}</span>
            <span className="col-span-1 text-right font-mono text-white">{n.status.peer_count ?? '—'}</span>
            <a href={`${n.api_url}/api/status`} target="_blank" rel="noreferrer"
              className="col-span-2 text-right text-forge-400 hover:underline font-mono text-xs">status</a>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-400">
        Files (genesis, logs, and private keys) are in <span className="font-mono">{chain.dir}</span>.
        State is in memory: stopping the chain discards it, and the next launch starts from genesis.
      </p>
    </div>
  );
}