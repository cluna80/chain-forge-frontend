import { type ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard, Plus, Activity, Search, Send,
  Server, Zap, Trophy, Building2,
} from 'lucide-react';

type Page =
  | 'dashboard' | 'wizard' | 'detail' | 'engine' | 'explorer' | 'tx'
  | 'machines' | 'jobs' | 'contribution' | 'challenge' | 'enterprise';

interface LayoutProps {
  current: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { id: 'dashboard', label: 'My Chains',    icon: LayoutDashboard },
      { id: 'wizard',    label: 'New Chain',     icon: Plus },
      { id: 'explorer',  label: 'Explorer',      icon: Search },
      { id: 'tx',        label: 'Tx Builder',    icon: Send },
      { id: 'engine',    label: 'Engine Status', icon: Activity },
    ],
  },
  {
    label: 'Identity',
    items: [
      { id: 'enterprise', label: 'Enterprise',   icon: Building2 },
    ],
  },
  {
    label: 'Resource Market',
    items: [
      { id: 'machines', label: 'Machines',       icon: Server },
      { id: 'jobs',     label: 'Resource Jobs',  icon: Activity },
    ],
  },
  {
    label: 'Contribution',
    items: [
      { id: 'contribution', label: 'Dual Mode',       icon: Zap },
      { id: 'challenge',    label: 'Grand Challenge',  icon: Trophy },
    ],
  },
];

export function Layout({ current, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-ink-700/60 bg-ink-900/60 backdrop-blur-md flex flex-col">
        <div className="p-5 border-b border-ink-700/60">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] text-ink-500 font-mono uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
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
