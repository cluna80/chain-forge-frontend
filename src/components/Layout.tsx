import { type ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { LayoutDashboard, Plus, Activity } from 'lucide-react';

type Page = 'dashboard' | 'wizard' | 'detail' | 'engine';

interface LayoutProps {
  current: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'My Chains', icon: LayoutDashboard },
  { id: 'wizard', label: 'New Chain', icon: Plus },
  { id: 'engine', label: 'Engine Status', icon: Activity },
];

export function Layout({ current, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-ink-700/60 bg-ink-900/60 backdrop-blur-md flex flex-col">
        <div className="p-5 border-b border-ink-700/60">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-forge-500/10 text-forge-400 border border-forge-500/20'
                    : 'text-ink-300 hover:text-white hover:bg-ink-750 border border-transparent'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-ink-700/60">
          <div className="px-3 py-2">
            <p className="text-[10px] text-ink-400 font-mono uppercase tracking-widest">Engine v0.1.0</p>
            <p className="text-[10px] text-ink-500 font-mono mt-0.5">Rust · No auth mode</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
