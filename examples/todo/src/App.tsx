/**
 * Todo App
 * ========
 * 
 * Simple todo application demonstrating protopal basics
 */

import React, { useState } from 'react';
import { todo, activeTodos, completedTodos, archivedTodos, completionStats, system } from './system';
import type { Todo } from './model';
import './App.css';

function TodoItem({ item }: { item: Todo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleComplete = () => {
    todo.dispatch({ type: 'CompleteTodo', payload: { id: item.id } });
  };

  const handleReactivate = () => {
    todo.dispatch({ type: 'ReactivateTodo', payload: { id: item.id } });
  };

  const handleArchive = () => {
    todo.dispatch({ type: 'ArchiveTodo', payload: { id: item.id } });
  };

  const handleEdit = () => {
    if (isEditing && editText.trim() !== item.text) {
      todo.dispatch({
        type: 'UpdateTodoText',
        payload: { id: item.id, text: editText.trim() }
      });
    }
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  return (
    <div className={`todo-item todo-item--${item.status.kind.toLowerCase()}`}>
      {isEditing ? (
        <div className="todo-edit">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEdit();
              if (e.key === 'Escape') handleCancel();
            }}
            autoFocus
          />
          <div className="todo-edit-actions">
            <button onClick={handleEdit} disabled={!editText.trim()}>
              ✓ Save
            </button>
            <button onClick={handleCancel}>✕ Cancel</button>
          </div>
        </div>
      ) : (
        <div className="todo-content">
          <div className="todo-text">{item.text}</div>
          <div className="todo-actions">
            {item.status.kind === 'Active' && (
              <>
                <button onClick={handleComplete} className="btn-complete">✓</button>
                <button onClick={handleEdit} className="btn-edit">✎</button>
                <button onClick={handleArchive} className="btn-archive">🗄</button>
              </>
            )}
            {item.status.kind === 'Completed' && (
              <>
                <button onClick={handleReactivate} className="btn-reactivate">↻</button>
                <button onClick={handleArchive} className="btn-archive">🗄</button>
              </>
            )}
            {item.status.kind === 'Archived' && (
              <span className="todo-status">Archived</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddTodoForm() {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      todo.dispatch({
        type: 'AddTodo',
        payload: {
          id: `todo-${Date.now()}`,
          text: text.trim(),
        }
      });
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-todo-form">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="add-todo-input"
      />
      <button type="submit" disabled={!text.trim()} className="add-todo-btn">
        Add Todo
      </button>
    </form>
  );
}

function Stats() {
  const stats = completionStats.value;
  
  return (
    <div className="stats">
      <div className="stat">
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.completed}</span>
        <span className="stat-label">Completed</span>
      </div>
      <div className="stat">
        <span className="stat-value">{stats.percentage}%</span>
        <span className="stat-label">Progress</span>
      </div>
    </div>
  );
}

function TracePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const entries = system.traceLog.value;

  const getTraceColor = (kind: string) => {
    switch (kind) {
      case 'command': return 'trace-command';
      case 'event': return 'trace-event';
      case 'error': return 'trace-error';
      default: return 'trace-default';
    }
  };

  return (
    <div className="trace-panel">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="trace-toggle"
      >
        Trace ({entries.length} entries) {isOpen ? '▼' : '▲'}
      </button>
      {isOpen && (
        <div className="trace-entries">
          {entries.slice(0, 20).map((entry, i) => (
            <div key={i} className={`trace-entry ${getTraceColor(entry.kind)}`}>
              {entry.kind === 'command' && (
                <span>⌘ {(entry.command as any).type} [{entry.source}]</span>
              )}
              {entry.kind === 'event' && (
                <span>⚡ {(entry.event as any).type}</span>
              )}
              {entry.kind === 'error' && (
                <span>❌ {entry.phase}: {String(entry.error)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodoSection({ title, todos, emptyMessage }: {
  title: string;
  todos: Todo[];
  emptyMessage: string;
}) {
  return (
    <div className="todo-section">
      <h2>{title} ({todos.length})</h2>
      {todos.length === 0 ? (
        <p className="empty-message">{emptyMessage}</p>
      ) : (
        <div className="todo-list">
          {todos.map(item => (
            <TodoItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>📝 Protopal Todo</h1>
        <p>A simple todo app demonstrating event sourcing with signals</p>
      </header>

      <Stats />
      
      <AddTodoForm />

      <div className="todos-container">
        <TodoSection
          title="Active"
          todos={activeTodos.value}
          emptyMessage="No active todos. Add one above!"
        />
        
        <TodoSection
          title="Completed"
          todos={completedTodos.value}
          emptyMessage="No completed todos yet."
        />
        
        <TodoSection
          title="Archived"
          todos={archivedTodos.value}
          emptyMessage="No archived todos."
        />
      </div>

      <TracePanel />
    </div>
  );
}