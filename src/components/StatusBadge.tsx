import type { ChainStatus } from '@/types';

const STATUS_CONFIG: Record<ChainStatus, { className: string; label: string }> = {
  draft: { className: 'badge-draft', label: 'Draft' },
  building: { className: 'badge-building', label: 'Building' },
  running: { className: 'badge-running', label: 'Running' },
  failed: { className: 'badge-failed', label: 'Failed' },
};

export function StatusBadge({ status }: { status: ChainStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`badge ${config.className}`}>
      {status === 'building' && (
        <span className="w-1.5 h-1.5 rounded-full bg-warn-400 animate-pulse-soft" />
      )}
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-soft" />
      )}
      {config.label}
    </span>
  );
}
