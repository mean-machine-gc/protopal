/**
 * Persistence Adapters for Protopal
 * ==================================
 * 
 * Save and restore decider state across sessions
 */

import type { Decider, System } from './protopal';

// ============================================================
// Core Interfaces
// ============================================================

export interface PersistenceAdapter {
  /** Save state for a decider */
  save(key: string, state: any): Promise<void>;
  
  /** Load state for a decider */
  load(key: string): Promise<any | null>;
  
  /** Delete saved state */
  delete(key: string): Promise<void>;
  
  /** List all saved keys */
  list(): Promise<string[]>;
}

export interface PersistenceOptions {
  /** Prefix for storage keys */
  prefix?: string;
  
  /** Auto-save on every state change */
  autoSave?: boolean;
  
  /** Debounce auto-save (ms) */
  saveDebounce?: number;
  
  /** Save event log in addition to state */
  saveEvents?: boolean;
  
  /** Maximum events to keep */
  maxEvents?: number;
}

// ============================================================
// LocalStorage Adapter
// ============================================================

export class LocalStorageAdapter implements PersistenceAdapter {
  constructor(private prefix = 'protopal') {}

  async save(key: string, state: any): Promise<void> {
    const fullKey = `${this.prefix}:${key}`;
    try {
      localStorage.setItem(fullKey, JSON.stringify(state));
    } catch (e) {
      console.error(`Failed to save state for ${key}:`, e);
      throw new Error(`LocalStorage save failed: ${e}`);
    }
  }

  async load(key: string): Promise<any | null> {
    const fullKey = `${this.prefix}:${key}`;
    try {
      const item = localStorage.getItem(fullKey);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error(`Failed to load state for ${key}:`, e);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = `${this.prefix}:${key}`;
    localStorage.removeItem(fullKey);
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    const prefix = `${this.prefix}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keys.push(key.slice(prefix.length));
      }
    }
    
    return keys;
  }
}

// ============================================================
// Persistence Manager
// ============================================================

export class PersistenceManager {
  private saveTimeouts = new Map<string, any>();
  private eventLogs = new Map<string, any[]>();
  
  constructor(
    private adapter: PersistenceAdapter,
    private options: PersistenceOptions = {}
  ) {
    this.options = {
      autoSave: true,
      saveDebounce: 500,
      saveEvents: false,
      maxEvents: 1000,
      ...options
    };
  }

  /** Enable persistence for a decider */
  enableForDecider<TCommand, TState, TEvent>(
    decider: Decider<TCommand, TState, TEvent>
  ): () => void {
    const key = decider.name;
    
    // Load initial state
    this.loadDeciderState(decider);
    
    if (this.options.autoSave) {
      // Subscribe to state changes
      const unsubscribe = this.subscribeToStateChanges(decider);
      
      // Subscribe to events if enabled
      const unsubscribeEvents = this.options.saveEvents
        ? this.subscribeToEvents(decider)
        : () => {};
      
      // Return cleanup function
      return () => {
        unsubscribe();
        unsubscribeEvents();
        this.clearSaveTimeout(key);
      };
    }
    
    return () => {};
  }

  /** Enable persistence for all deciders in a system */
  enableForSystem(system: System): () => void {
    // Note: This would require System to expose its deciders
    // For now, users need to call enableForDecider individually
    console.warn('enableForSystem not yet implemented. Use enableForDecider for each decider.');
    return () => {};
  }

  /** Manually save decider state */
  async saveDeciderState<TState>(decider: Decider<any, TState, any>): Promise<void> {
    const state = decider.state.value;
    await this.adapter.save(decider.name, state);
    
    if (this.options.saveEvents) {
      const events = this.eventLogs.get(decider.name) || [];
      await this.adapter.save(`${decider.name}:events`, events);
    }
  }

  /** Manually load decider state */
  async loadDeciderState<TState>(decider: Decider<any, TState, any>): Promise<void> {
    const savedState = await this.adapter.load(decider.name);
    if (savedState !== null) {
      // Directly set the signal value
      decider.state.value = savedState;
    }
    
    if (this.options.saveEvents) {
      const savedEvents = await this.adapter.load(`${decider.name}:events`);
      if (savedEvents) {
        this.eventLogs.set(decider.name, savedEvents);
      }
    }
  }

  /** Clear saved state for a decider */
  async clearDeciderState(deciderName: string): Promise<void> {
    await this.adapter.delete(deciderName);
    if (this.options.saveEvents) {
      await this.adapter.delete(`${deciderName}:events`);
    }
    this.eventLogs.delete(deciderName);
  }

  /** Get saved event log for a decider */
  getEventLog(deciderName: string): any[] {
    return this.eventLogs.get(deciderName) || [];
  }

  // Private helpers

  private subscribeToStateChanges<TState>(
    decider: Decider<any, TState, any>
  ): () => void {
    // Watch for state changes using computed
    let previousState = decider.state.value;
    
    // Check periodically (signals don't have built-in subscription)
    const interval = setInterval(() => {
      const currentState = decider.state.value;
      if (currentState !== previousState) {
        previousState = currentState;
        this.scheduleSave(decider);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }

  private subscribeToEvents<TEvent>(
    decider: Decider<any, any, TEvent>
  ): () => void {
    return decider.events.subscribe((event) => {
      const key = decider.name;
      const events = this.eventLogs.get(key) || [];
      events.push({
        event,
        timestamp: Date.now()
      });
      
      // Trim to max events
      if (this.options.maxEvents && events.length > this.options.maxEvents) {
        events.splice(0, events.length - this.options.maxEvents);
      }
      
      this.eventLogs.set(key, events);
      
      if (this.options.autoSave) {
        this.scheduleSave(decider);
      }
    });
  }

  private scheduleSave<TState>(decider: Decider<any, TState, any>): void {
    const key = decider.name;
    
    // Clear existing timeout
    this.clearSaveTimeout(key);
    
    // Schedule new save
    const timeout = setTimeout(() => {
      this.saveDeciderState(decider).catch(console.error);
    }, this.options.saveDebounce);
    
    this.saveTimeouts.set(key, timeout);
  }

  private clearSaveTimeout(key: string): void {
    const timeout = this.saveTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.saveTimeouts.delete(key);
    }
  }
}

// ============================================================
// Convenience Functions
// ============================================================

/** Create a persistence-enabled decider */
export function createPersistedDecider<TCommand, TState, TContext, TEvent>(
  system: System,
  config: import('./protopal').DeciderConfig<TCommand, TState, TContext, TEvent>,
  adapter: PersistenceAdapter = new LocalStorageAdapter(),
  options?: PersistenceOptions
): Decider<TCommand, TState, TEvent> {
  const decider = system.addDecider(config);
  const manager = new PersistenceManager(adapter, options);
  manager.enableForDecider(decider);
  return decider;
}

/** Add persistence to an existing system */
export function enablePersistence(
  system: System,
  adapter: PersistenceAdapter = new LocalStorageAdapter(),
  options?: PersistenceOptions
): PersistenceManager {
  return new PersistenceManager(adapter, options);
}