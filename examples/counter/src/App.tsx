import React, { useState } from 'react';
import { 
  counter, 
  isPositive, 
  currentMode, 
  isPaused,
  isInCountdown,
  countdownProgress, 
  hasReachedTarget,
  average, 
  recentHistory,
  system 
} from './system';
import './App.css';

export function App() {
  const [targetInput, setTargetInput] = useState('');
  
  const handleSetTarget = () => {
    const target = parseInt(targetInput);
    if (!isNaN(target)) {
      counter.dispatch({ type: 'SetCountdownTarget', payload: { target } });
      setTargetInput('');
    }
  };
  
  const mode = currentMode.value;
  const state = counter.state.value;

  return (
    <div className="app">
      <header>
        <h1>Protopal Counter Example</h1>
        <p>A reactive counter with signals - no hooks needed!</p>
      </header>

      <main>
        <div className="counter-display">
          <h2>{state.value}</h2>
          <div className="status">
            <span className={`badge mode-${mode.toLowerCase()}`}>{mode}</span>
            {isPositive.value && <span className="badge positive">Positive</span>}
            {hasReachedTarget.value && <span className="badge success">Target Reached! 🎉</span>}
          </div>
        </div>

        <div className="controls">
          <button 
            onClick={() => counter.dispatch({ type: 'Increment', payload: { amount: 1 } })}
            disabled={isPaused.value}
          >
            +1
          </button>
          <button 
            onClick={() => counter.dispatch({ type: 'Increment', payload: { amount: 5 } })}
            disabled={isPaused.value}
          >
            +5
          </button>
          <button 
            onClick={() => counter.dispatch({ type: 'Decrement', payload: { amount: 1 } })}
            disabled={isPaused.value}
          >
            -1
          </button>
          <button onClick={() => counter.dispatch({ type: 'Reset' })}>
            Reset
          </button>
        </div>
        
        <div className="mode-controls">
          <button 
            onClick={() => counter.dispatch({ type: 'ChangeMode', payload: { mode: 'counting' } })}
            disabled={mode === 'Counting' || isPaused.value}
            className={mode === 'Counting' ? 'active' : ''}
          >
            Counting Mode
          </button>
          <button 
            onClick={() => counter.dispatch({ type: 'ChangeMode', payload: { mode: 'countdown' } })}
            disabled={mode === 'Countdown' || isPaused.value}
            className={mode === 'Countdown' ? 'active' : ''}
          >
            Countdown Mode
          </button>
          {!isPaused.value ? (
            <button onClick={() => counter.dispatch({ type: 'Pause' })}>
              Pause
            </button>
          ) : (
            <button onClick={() => counter.dispatch({ type: 'Resume' })}>
              Resume
            </button>
          )}
        </div>

        <div className="stats">
          <div className="stat">
            <label>Clicks</label>
            <span>{state.clicks}</span>
          </div>
          <div className="stat">
            <label>Average</label>
            <span>{average.value.toFixed(2)}</span>
          </div>
          {isInCountdown.value && state.mode.kind === 'Countdown' && (
            <div className="stat">
              <label>Target</label>
              <span>{state.mode.targetValue}</span>
            </div>
          )}
        </div>

        {isInCountdown.value && (
          <>
            <div className="progress-section">
              <label>Progress to target:</label>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${countdownProgress.value}%` }}
                />
              </div>
              <span>{countdownProgress.value.toFixed(0)}%</span>
            </div>

            <div className="target-section">
              <input
                type="number"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                placeholder="New target"
                disabled={isPaused.value}
              />
              <button onClick={handleSetTarget} disabled={isPaused.value}>
                Set Target
              </button>
            </div>
          </>
        )}

        <div className="history">
          <h3>Recent Activity</h3>
          <div className="history-list">
            {recentHistory.value.map((entry, i) => (
              <div key={i} className={`history-entry history-${entry.kind.toLowerCase()}`}>
                <span>{formatHistoryEntry(entry)}</span>
                <span className="timestamp">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
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
      <summary>System Trace ({entries.length} entries)</summary>
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
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  
  switch (entry.kind) {
    case 'command':
      return `[${timestamp}] ⌘ ${entry.command.type} [${entry.source}]`;
    case 'event':
      return `[${timestamp}] ⚡ ${entry.event.type}`;
    case 'evolve':
      return `[${timestamp}] 📦 State updated`;
    case 'error':
      return `[${timestamp}] ❌ ${entry.phase}: ${entry.error}`;
    default:
      return `[${timestamp}] ${entry.kind}`;
  }
}

function formatHistoryEntry(entry: any): string {
  switch (entry.kind) {
    case 'Incremented':
      return `+${entry.amount} → ${entry.newValue}`;
    case 'Decremented':
      return `-${entry.amount} → ${entry.newValue}`;
    case 'Reset':
      return `Reset from ${entry.previousValue}`;
    case 'ModeChanged':
      return `Mode: ${entry.from} → ${entry.to}`;
    case 'TargetReached':
      return `🎯 Target ${entry.value} reached!`;
    default:
      return entry.kind;
  }
}