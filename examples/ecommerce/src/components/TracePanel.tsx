import React from 'react';
import { ecommerce } from '../system';

export function TracePanel() {
  const entries = ecommerce.system.traceLog.value;

  return (
    <details className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 text-xs max-h-64 overflow-auto">
      <summary className="p-3 cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
        <span className="font-medium">System Trace ({entries.length} entries)</span>
      </summary>
      <div className="p-3 space-y-1 font-mono">
        {entries.map((entry, i) => (
          <div key={i} className={getTraceStyle(entry.kind)}>
            {formatTraceEntry(entry)}
          </div>
        ))}
      </div>
    </details>
  );
}

function getTraceStyle(kind: string): string {
  const styles: Record<string, string> = {
    command: 'text-blue-300',
    event: 'text-yellow-300',
    'process-manager': 'text-green-300',
    evolve: 'text-purple-300',
    projection: 'text-cyan-300',
    error: 'text-red-400',
  };
  return styles[kind] || 'text-gray-400';
}

function formatTraceEntry(entry: any): string {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  
  switch (entry.kind) {
    case 'command':
      return `[${timestamp}] ⌘ ${entry.command.type} [${entry.source}]`;
    case 'event':
      return `[${timestamp}] ⚡ ${entry.event.type}`;
    case 'process-manager':
      return `[${timestamp}] 🔄 ${entry.manager} → ${entry.commands.length} cmd(s)`;
    case 'evolve':
      return `[${timestamp}] 📦 State updated`;
    case 'projection':
      return `[${timestamp}] 📊 ${entry.projector} updated`;
    case 'error':
      return `[${timestamp}] ❌ ${entry.phase}: ${String(entry.error)}`;
    default:
      return `[${timestamp}] ${entry.kind}`;
  }
}