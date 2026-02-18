import React, { useState } from 'react';
import { items, activeItems, completedItems, stats, system } from './system';

export function App() {
  const [itemName, setItemName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemName.trim()) {
      items.dispatch({
        type: 'CreateItem',
        payload: { name: itemName.trim() }
      });
      setItemName('');
    }
  };

  return (
    <div className="app">
      <header>
        <h1>My Protopal App</h1>
        <p>Start building your domain model!</p>
      </header>

      <main>
        <form onSubmit={handleSubmit} className="create-form">
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter item name..."
            autoFocus
          />
          <button type="submit" disabled={!itemName.trim()}>
            Add Item
          </button>
        </form>

        <div className="stats">
          <p>
            <span>Active: {stats.value.active}</span> | 
            <span>Completed: {stats.value.completed}</span> | 
            <span>Total: {stats.value.total}</span>
          </p>
        </div>

        <div className="sections">
          {activeItems.value.length > 0 && (
            <section>
              <h3>Active Items</h3>
              <div className="item-list">
                {activeItems.value.map(item => (
                  <div key={item.id} className="item item-active">
                    <span>{item.name}</span>
                    <div className="item-actions">
                      <button
                        onClick={() => items.dispatch({
                          type: 'CompleteItem',
                          payload: { id: item.id }
                        })}
                        className="complete-btn"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => items.dispatch({
                          type: 'ArchiveItem',
                          payload: { id: item.id, reason: 'Manual archive' }
                        })}
                        className="archive-btn"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {completedItems.value.length > 0 && (
            <section>
              <h3>Completed Items</h3>
              <div className="item-list">
                {completedItems.value.map(item => (
                  <div key={item.id} className="item item-completed">
                    <span>{item.name}</span>
                    <div className="item-actions">
                      <button
                        onClick={() => items.dispatch({
                          type: 'ReactivateItem',
                          payload: { id: item.id }
                        })}
                        className="reactivate-btn"
                      >
                        Reactivate
                      </button>
                      <button
                        onClick={() => items.dispatch({
                          type: 'DeleteItem',
                          payload: { id: item.id }
                        })}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {activeItems.value.length === 0 && completedItems.value.length === 0 && (
            <p className="empty-state">No items yet. Create your first one above!</p>
          )}
        </div>
      </main>

      <TracePanel />
    </div>
  );
}

function TracePanel() {
  const entries = system.traceLog.value;
  
  return (
    <details className="trace-panel">
      <summary>Trace ({entries.length} entries)</summary>
      <div className="trace-content">
        {entries.slice(0, 50).map((entry, i) => (
          <div key={i} className={`trace-entry trace-${entry.kind}`}>
            {formatTraceEntry(entry)}
          </div>
        ))}
      </div>
    </details>
  );
}

function formatTraceEntry(entry: any): string {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  
  switch (entry.kind) {
    case 'command':
      return `[${time}] ⌘ ${entry.command.type} [${entry.source}]`;
    case 'event':
      return `[${time}] ⚡ ${entry.event.type}`;
    case 'evolve':
      return `[${time}] 📦 State updated`;
    case 'error':
      return `[${time}] ❌ ${entry.phase}: ${entry.error}`;
    default:
      return `[${time}] ${entry.kind}`;
  }
}