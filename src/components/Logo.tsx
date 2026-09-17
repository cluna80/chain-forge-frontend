import { Boxes } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };
  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 30,
  };
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-forge-500 to-violet-600 flex items-center justify-center shadow-lg shadow-forge-700/30`}>
        <Boxes size={iconSizes[size]} className="text-white" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`font-bold text-white tracking-tight ${size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'}`}>
          Chain Forge
        </span>
        {size !== 'sm' && (
          <span className="text-[10px] text-ink-400 font-mono uppercase tracking-widest">
            Blockchain Studio
          </span>
        )}
      </div>
    </div>
  );
}
