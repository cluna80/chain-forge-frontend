import { useMemo } from 'react';

interface JsonViewerProps {
  data: unknown;
  className?: string;
}

export function JsonViewer({ data, className = '' }: JsonViewerProps) {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const highlighted = useMemo(() => {
    return formatted
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, (match) => {
        let cls = 'text-success-400';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-forge-400';
          } else {
            cls = 'text-violet-400';
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-warn-400';
        } else if (/null/.test(match)) {
          cls = 'text-ink-400';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  }, [formatted]);

  return (
    <pre className={`json-viewer ${className}`}>
      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}
