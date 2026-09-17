export type ChainStatus = 'draft' | 'building' | 'running' | 'failed';

export type SignatureScheme = 'classical' | 'hybrid' | 'pqc-native';
export type PqcAlgorithm = 'ml-dsa' | 'falcon' | 'sphincs-plus';
export type MigrationTrigger = 'nist-guidance' | 'demonstrated-crqc' | 'calendar-review' | 'governance-vote';
export type HashWidth = 256 | 384;

export type EnvironmentMode = 'devnet' | 'testnet' | 'mainnet';
export type PeerDiscovery = 'mdns' | 'bootstrap' | 'both';
export type AccountRole = 'validator' | 'treasury' | 'faucet' | 'user';

export interface GenesisAccount {
  id: string;          // client-side row key only, not written to genesis
  label: string;
  address: string;
  balance: string;     // string to avoid float precision issues with large supplies
  role: AccountRole;
}

export interface ChainConfig {
  basics: {
    chainName: string;
    chainId: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDenom: string;
    addressPrefix: string;
    maxSupply: string;
  };
  environment: {
    mode: EnvironmentMode;
    faucetEnabled: boolean;
    relaxedLimits: boolean;
  };
  consensus: {
    mechanism: 'pos' | 'poa';
    validatorSetSize: number;
    blockTimeMs: number;
  };
  execution: {
    stateModel: 'account' | 'utxo' | 'hybrid';
    parallelExecution: boolean;
    gasModel: 'fixed' | 'dynamic' | 'eip-1559-style';
  };
  modules: {
    selected: string[];
    customModule: string;
  };
  cryptography: {
    signatureScheme: SignatureScheme;
    pqcAlgorithm: PqcAlgorithm | null;
    migrationTrigger: MigrationTrigger;
    hashWidth: HashWidth;
    validatorScheme: 'same-as-accounts' | 'pqc-native';
  };
  network: {
    networkId: string;
    p2pPort: number;
    rpcPort: number;
    bootstrapNodes: string;   // one multiaddr per line
    peerDiscovery: PeerDiscovery;
    maxPeers: number;
  };
  limits: {
    maxBlockBytes: number;
    maxTxBytes: number;
    blockGasLimit: number;
    mempoolSize: number;
    mempoolTtlSeconds: number;
  };
  genesisAccounts: {
    accounts: GenesisAccount[];
  };
}

export interface Chain {
  id: string;
  user_id: string;
  name: string;
  chain_id: string;
  status: ChainStatus;
  engine_version: string;
  config: ChainConfig;
  genesis_json: Record<string, unknown> | null;
  build_logs: string | null;
  node_status: Record<string, unknown> | null;
  explorer_url: string | null;
  repo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngineLayer {
  id: string;
  name: string;
  description: string;
  status: 'implemented' | 'partial' | 'stubbed';
  version: string;
  details: string[];
}

export interface EngineModule {
  id: string;
  name: string;
  description: string;
  category: string;
  available: boolean;
}