import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Wizard } from '@/pages/Wizard';
import { ChainDetail } from '@/pages/ChainDetail';
import { EngineStatus } from '@/pages/EngineStatus';
import type { Chain } from '@/types';

type Page = 'dashboard' | 'wizard' | 'detail' | 'engine';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  const handleNavigate = (p: Page) => {
    if (p === 'wizard') setSelectedChainId(null);
    setPage(p);
  };

  const handleOpenChain = (chain: Chain) => {
    setSelectedChainId(chain.id);
    setPage('detail');
  };

  return (
    <Layout current={page} onNavigate={handleNavigate}>
      {page === 'dashboard' && (
        <Dashboard
          onNewChain={() => setPage('wizard')}
          onOpenChain={handleOpenChain}
        />
      )}
      {page === 'wizard' && (
        <Wizard
          onDone={() => setPage('dashboard')}
          onCancel={() => setPage('dashboard')}
        />
      )}
      {page === 'detail' && selectedChainId && (
        <ChainDetail
          chainId={selectedChainId}
          onBack={() => setPage('dashboard')}
        />
      )}
      {page === 'engine' && <EngineStatus />}
    </Layout>
  );
}
