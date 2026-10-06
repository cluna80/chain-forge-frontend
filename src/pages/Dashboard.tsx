import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Chain } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, Boxes, Clock, Cpu, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface DashboardProps {
  onNewChain: () => void;
  onOpenChain: (chain: Chain) => void;
}

export function Dashboard({ onNewChain, onOpenChain }: DashboardProps) {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChains();
  }, []);

  const loadChains = async () => {
    setLoading(true);
    if (!supabase) {
      setError('Supabase not configured — chain storage unavailable.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('chains')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setChains((data ?? []) as Chain[]);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Chains</h1>
          <p className="text-sm text-ink-300 mt-1">
            Manage your blockchain projects across draft, building, and running states
          </p>
        </div>
        <button onClick={onNewChain} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Chain
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-forge-400" />
        </div>
      )}

      {error && (
        <div className="card p-6 flex items-center gap-3 text-danger-400">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && !error && chains.length === 0 && (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-ink-750 flex items-center justify-center mx-auto mb-4">
            <Boxes size={32} className="text-ink-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No chains yet</h2>
          <p className="text-sm text-ink-300 mb-6 max-w-sm mx-auto">
            Create your first blockchain using the Chain Forge wizard. Configure consensus, execution, and modules — then generate a genesis.
          </p>
          <button onClick={onNewChain} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Create Your First Chain
          </button>
        </div>
      )}

      {!loading && !error && chains.length > 0 && (
        <div className="grid gap-4 animate-fade-in">
          {chains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => onOpenChain(chain)}
              className="card card-hover p-5 text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-forge-500/20 to-violet-500/20 border border-ink-600 flex items-center justify-center shrink-0">
                    <Boxes size={22} className="text-forge-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-white truncate">{chain.name}</h3>
                      <StatusBadge status={chain.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ink-400 font-mono">
                      <span>{chain.chain_id}</span>
                      <span className="flex items-center gap-1">
                        <Cpu size={12} />
                        v{chain.engine_version}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(chain.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-ink-400 group-hover:text-forge-400 group-hover:translate-x-1 transition-all shrink-0 ml-4" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
