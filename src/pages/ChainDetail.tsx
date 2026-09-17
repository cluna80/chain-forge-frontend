import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Chain } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { JsonViewer } from '@/components/JsonViewer';
import { ENGINE_VERSION } from '@/lib/engineData';
import {
  ArrowLeft, Boxes, Cpu, FileJson, Terminal,
  ExternalLink, Github, Activity, Trash2, Loader2, AlertCircle,
  RefreshCw,
} from 'lucide-react';

const NODE_API = 'http://localhost:8080';

interface NodeStatus {
  chain_id: string;
  environment: string;
  height: number;
  peer_count: number;
  state_root: string | null;
  engine_version: string;
  is_running: boolean;
}

interface ChainDetailProps {
  chainId: string;
  onBack: () => void;
}

type Tab = 'genesis' | 'logs' | 'node';

export function ChainDetail({ chainId, onBack }: ChainDetailProps) {
  const [chain, setChain] = useState<Chain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('genesis');
  const [deleting, setDeleting] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [nodeReachable, setNodeReachable] = useState<boolean | null>(null);

  const pollNodeStatus = useCallback(async () => {
    try {
      const res = await fetch(`${NODE_API}/api/status`);
      const data: NodeStatus = await res.json();
      setNodeStatus(data);
      setNodeReachable(true);
    } catch {
      setNodeReachable(false);
      setNodeStatus(null);
    }
  }, []);

  useEffect(() => {
    loadChain();
    pollNodeStatus();
    const interval = setInterval(pollNodeStatus, 2000);
    return () => clearInterval(interval);
  }, [chainId, pollNodeStatus]);

  const loadChain = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chains')
      .select('*')
      .eq('id', chainId)
      .maybeSingle();
    if (error) {
      setError(error.message);
    } else if (!data) {
      setError('Chain not found');
    } else {
      setChain(data as Chain);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('chains').delete().eq('id', chainId);
    setDeleting(false);
    onBack();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-forge-400" />
      </div>
    );
  }

  if (error || !chain) {
    return (
      <div className="p-8">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 mb-6">
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <div className="card p-8 text-center">
          <AlertCircle size={32} className="text-danger-400 mx-auto mb-3" />
          <p className="text-sm text-ink-300">{error ?? 'Chain not found'}</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof FileJson }[] = [
    { id: 'genesis', label: 'Genesis Config', icon: FileJson },
    { id: 'logs', label: 'Build Logs', icon: Terminal },
    { id: 'node', label: 'Node Status', icon: Activity },
  ];

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <button onClick={onBack} className="btn-ghost flex items-center gap-2 mb-6">
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-forge-500/20 to-violet-500/20 border border-ink-600 flex items-center justify-center">
              <Boxes size={28} className="text-forge-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white">{chain.name}</h1>
                <StatusBadge status={chain.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-ink-400 font-mono">
                <span>{chain.chain_id}</span>
                <span className="flex items-center gap-1">
                  <Cpu size={12} />
                  v{chain.engine_version}
                </span>
                <span>Created {new Date(chain.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-ghost text-danger-400 hover:bg-danger-500/10 flex items-center gap-2"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>

        {/* Links */}
        {(chain.explorer_url || chain.repo_url) && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-ink-700/50">
            {chain.explorer_url && (
              <a
                href={chain.explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ExternalLink size={14} />
                Block Explorer
              </a>
            )}
            {chain.repo_url && (
              <a
                href={chain.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Github size={14} />
                Repository
              </a>
            )}
          </div>
        )}
      </div>

      {/* Config summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card p-3">
          <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">Consensus</p>
          <p className="text-sm font-mono text-white uppercase">{chain.config?.consensus?.mechanism ?? '-'}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">Validators</p>
          <p className="text-sm font-mono text-white">{chain.config?.consensus?.validatorSetSize ?? '-'}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">Block Time</p>
          <p className="text-sm font-mono text-white">{chain.config?.consensus?.blockTimeMs ?? '-'}ms</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">Modules</p>
          <p className="text-sm font-mono text-white">{chain.config?.modules?.selected?.length ?? 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-ink-700/60">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.id
                  ? 'border-forge-500 text-forge-400'
                  : 'border-transparent text-ink-300 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in" key={tab}>
        {tab === 'genesis' && (
          <div>
            {chain.genesis_json ? (
              <JsonViewer data={chain.genesis_json} />
            ) : (
              <div className="card p-8 text-center">
                <FileJson size={28} className="text-ink-400 mx-auto mb-3" />
                <p className="text-sm text-ink-300">No genesis config generated yet.</p>
                <p className="text-xs text-ink-400 mt-1">
                  The engine build API is not yet live. Once available, the genesis will be generated here.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div>
            {chain.build_logs ? (
              <div className="json-viewer whitespace-pre-wrap">{chain.build_logs}</div>
            ) : (
              <div className="card p-8 text-center">
                <Terminal size={28} className="text-ink-400 mx-auto mb-3" />
                <p className="text-sm text-ink-300">No build logs yet.</p>
                <p className="text-xs text-ink-400 mt-1">
                  Build logs will stream here once the engine compile API is connected.
                  The Rust engine's build endpoint is coming soon.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'node' && (
          <div className="space-y-4">
            {/* Node connectivity banner */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              nodeReachable === true
                ? 'border-success-500/30 bg-success-500/5'
                : nodeReachable === false
                ? 'border-danger-500/30 bg-danger-500/5'
                : 'border-ink-700 bg-ink-900/30'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  nodeReachable === true ? 'bg-success-400 animate-pulse' :
                  nodeReachable === false ? 'bg-danger-400' : 'bg-ink-400'
                }`} />
                <span className="text-sm text-ink-200">
                  {nodeReachable === true
                    ? 'Node reachable at localhost:8080'
                    : nodeReachable === false
                    ? 'Node not reachable — start chain-forge-node to connect'
                    : 'Checking node status...'}
                </span>
              </div>
              <button
                onClick={pollNodeStatus}
                className="btn-ghost p-1.5"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Live node status */}
            {nodeStatus ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-3">Chain</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-400">Chain ID</span>
                      <span className="text-white font-mono">{nodeStatus.chain_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Environment</span>
                      <span className="text-white font-mono">{nodeStatus.environment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Engine</span>
                      <span className="text-white font-mono">v{nodeStatus.engine_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Running</span>
                      <span className={nodeStatus.is_running ? 'text-success-400 font-mono' : 'text-danger-400 font-mono'}>
                        {nodeStatus.is_running ? 'yes' : 'no'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-3">Consensus</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-400">Height</span>
                      <span className="text-white font-mono text-lg font-bold">{nodeStatus.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Peers</span>
                      <span className="text-white font-mono">{nodeStatus.peer_count}</span>
                    </div>
                  </div>
                </div>

                <div className="card p-4 col-span-2">
                  <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">State Root</p>
                  <p className="text-xs font-mono text-forge-300 break-all">
                    {nodeStatus.state_root ?? 'pending first block'}
                  </p>
                </div>
              </div>
            ) : nodeReachable === false ? (
              <div className="card p-6">
                <p className="text-xs text-ink-400 font-mono mb-2">Start the node with:</p>
                <pre className="text-xs text-forge-300 font-mono bg-ink-900 p-3 rounded-lg overflow-x-auto">
{`.\\target\\release\\chain-forge-node.exe --genesis qcb-genesis.json --api-port 8080`}
                </pre>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Engine version footer */}
      <div className="mt-6 text-xs text-ink-500 font-mono text-center">
        Chain Forge Engine v{ENGINE_VERSION} — node API: {nodeReachable === true ? 'connected' : 'not connected'}
      </div>
    </div>
  );
}