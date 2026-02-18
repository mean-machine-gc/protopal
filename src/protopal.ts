/**
 * Protopal - Event Sourcing Runtime for React
 * ===========================================
 *
 * A reactive event-sourcing runtime using @preact/signals-react.
 *
 * Signals handle: state (write model), projections (read models), derived views.
 * A minimal EventBus handles: commands, events, process manager reactions.
 *
 * Components read signal.value directly in JSX — no hooks, no subscriptions,
 * automatic re-rendering.
 *
 * Topology:
 *
 *   dispatch(cmd) → resolveContext → decide(cmd, state, ctx) → events
 *                                      ↑                         │
 *                              state.value                       ├→ evolve → state.value = newState
 *                                                                ├→ project → readState.value = newReadState
 *                                                                └→ processManager → dispatch(cmd) (loop)
 */

// Auto-import React integration for better DX
if (typeof window !== 'undefined' && !window.__PROTOPAL_REACT_AUTO_IMPORTED__) {
  try {
    import('@preact/signals-react/auto');
    window.__PROTOPAL_REACT_AUTO_IMPORTED__ = true;
  } catch (e) {
    console.warn('Protopal: Failed to auto-import React integration. Add `import "@preact/signals-react/auto"` to your app entry point.');
  }
}

import { signal, computed, type Signal, type ReadonlySignal } from '@preact/signals-react';
import type { z } from 'zod';

// ============================================================
// Minimal Event Bus — for discrete events, not state
// ============================================================

export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;

export class EventBus<T> {
  private listeners = new Set<Listener<T>>();

  emit(value: T): void {
    this.listeners.forEach((l) => l(value));
  }

  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  filter(predicate: (value: T) => boolean): EventBus<T> {
    const filtered = new EventBus<T>();
    this.subscribe((value) => {
      if (predicate(value)) filtered.emit(value);
    });
    return filtered;
  }
}

// ============================================================
// Core type signatures — same as before, no RxJS
// ============================================================

export type Decide<TCommand, TState, TContext, TEvent> = (
  command: TCommand,
  state: TState,
  context: TContext
) => TEvent[];

export type Evolve<TState, TEvent> = (
  state: TState,
  event: TEvent
) => TState;

export type ResolveContext<TCommand, TContext> = (
  command: TCommand
) => Promise<TContext> | TContext;

export type Project<TReadState, TEvent> = (
  readState: TReadState,
  event: TEvent
) => TReadState;

export type React<TEvent, TCommand> = (
  event: TEvent
) => TCommand[];

// ============================================================
// Trace
// ============================================================

export type TraceEntry =
  | { kind: 'command'; timestamp: number; command: any; source: string }
  | { kind: 'context'; timestamp: number; command: any; context: any }
  | { kind: 'event'; timestamp: number; event: any; causedBy: any }
  | { kind: 'evolve'; timestamp: number; event: any; before: any; after: any }
  | { kind: 'projection'; timestamp: number; projector: string; event: any }
  | { kind: 'process-manager'; timestamp: number; manager: string; trigger: any; commands: any[] }
  | { kind: 'error'; timestamp: number; phase: string; error: any };

// ============================================================
// Decider
// ============================================================

export interface DeciderConfig<TCommand, TState, TContext, TEvent> {
  name: string;
  initialState: TState;
  commandSchema?: z.ZodSchema<TCommand>;
  decide: Decide<TCommand, TState, TContext, TEvent>;
  evolve: Evolve<TState, TEvent>;
  resolveContext: ResolveContext<TCommand, TContext>;
}

export interface Decider<TCommand, TState, TEvent> {
  name: string;

  /** Current write state — read .value in JSX, auto-re-renders */
  state: Signal<TState>;

  /** Dispatch a command */
  dispatch: (command: TCommand) => void;

  /** Event bus for this decider */
  events: EventBus<TEvent>;
}

export function createDecider<TCommand, TState, TContext, TEvent>(
  config: DeciderConfig<TCommand, TState, TContext, TEvent>,
  trace?: EventBus<TraceEntry>
): Decider<TCommand, TState, TEvent> {
  const state = signal<TState>(config.initialState);
  const events = new EventBus<TEvent>();

  const dispatch = async (command: TCommand, source = 'user') => {
    trace?.emit({ kind: 'command', timestamp: Date.now(), command, source });

    try {
      // Validate command if schema provided
      if (config.commandSchema) {
        const result = config.commandSchema.safeParse(command);
        if (!result.success) {
          const validationEvent = {
            type: 'CommandValidationFailed',
            payload: {
              command: (command as any).type || 'unknown',
              errors: result.error.format(),
              issues: result.error.issues,
            }
          };
          trace?.emit({ kind: 'event', timestamp: Date.now(), event: validationEvent, causedBy: command });
          // Emit as a regular event so it can be handled
          events.emit(validationEvent as TEvent);
          return;
        }
      }

      // Resolve context (may be sync or async)
      const context = await config.resolveContext(command);
      trace?.emit({ kind: 'context', timestamp: Date.now(), command, context });

      // Decide: command + state + context → events
      const emitted = config.decide(command, state.value, context);

      // Process each event
      for (const event of emitted) {
        trace?.emit({ kind: 'event', timestamp: Date.now(), event, causedBy: command });

        // Evolve: state + event → new state
        const before = state.value;
        state.value = config.evolve(before, event);
        trace?.emit({ kind: 'evolve', timestamp: Date.now(), event, before, after: state.value });

        // Push to event bus (projectors and PMs subscribe here)
        events.emit(event);
      }
    } catch (error) {
      trace?.emit({ kind: 'error', timestamp: Date.now(), phase: 'decide', error });
    }
  };

  return { name: config.name, state, dispatch, events };
}

// ============================================================
// Projector — computed read model from events
// ============================================================

export interface ProjectorConfig<TReadState, TEvent> {
  name: string;
  initialState: TReadState;
  project: Project<TReadState, TEvent>;
}

export interface Projector<TReadState> {
  name: string;
  /** Read state — use .value in JSX, auto-re-renders */
  state: Signal<TReadState>;
  destroy: Unsubscribe;
}

export function createProjector<TReadState, TEvent>(
  config: ProjectorConfig<TReadState, TEvent>,
  events: EventBus<TEvent>,
  trace?: EventBus<TraceEntry>
): Projector<TReadState> {
  const state = signal<TReadState>(config.initialState);

  const unsub = events.subscribe((event) => {
    try {
      state.value = config.project(state.value, event);
      trace?.emit({ kind: 'projection', timestamp: Date.now(), projector: config.name, event });
    } catch (error) {
      trace?.emit({ kind: 'error', timestamp: Date.now(), phase: 'project', error });
    }
  });

  return { name: config.name, state, destroy: unsub };
}

// ============================================================
// Process Manager — reacts to events, emits commands
// ============================================================

export interface ProcessManagerConfig<TEvent, TCommand> {
  name: string;
  filter: (event: TEvent) => boolean;
  react: React<TEvent, TCommand>;
}

export function createProcessManager<TEvent, TCommand>(
  config: ProcessManagerConfig<TEvent, TCommand>,
  sourceEvents: EventBus<TEvent>,
  targetDispatch: (command: TCommand) => void,
  trace?: EventBus<TraceEntry>
): Unsubscribe {
  return sourceEvents.subscribe((event) => {
    if (!config.filter(event)) return;

    try {
      const commands = config.react(event);
      trace?.emit({
        kind: 'process-manager',
        timestamp: Date.now(),
        manager: config.name,
        trigger: event,
        commands,
      });

      for (const command of commands) {
        targetDispatch(command);
      }
    } catch (error) {
      trace?.emit({ kind: 'error', timestamp: Date.now(), phase: 'process-manager', error });
    }
  });
}

// ============================================================
// System — wires everything together
// ============================================================

export class System {
  private deciders = new Map<string, Decider<any, any, any>>();
  private cleanups: Unsubscribe[] = [];
  readonly trace = new EventBus<TraceEntry>();

  /** Trace entries as a signal — read in JSX for debug panel */
  readonly traceLog = signal<TraceEntry[]>([]);

  /** All events across all deciders */
  readonly allEvents = new EventBus<{ decider: string; event: any }>();

  constructor(enableConsoleTrace = false) {
    // Collect trace entries into signal
    this.cleanups.push(
      this.trace.subscribe((entry) => {
        this.traceLog.value = [entry, ...this.traceLog.value].slice(0, 200);
      })
    );

    if (enableConsoleTrace) {
      this.cleanups.push(
        this.trace.subscribe((entry) => {
          const t = new Date(entry.timestamp).toISOString().slice(11, 23);
          switch (entry.kind) {
            case 'command':
              console.log(`[${t}] ⌘`, (entry.command as any)?.type, entry.source);
              break;
            case 'event':
              console.log(`[${t}] ⚡`, (entry.event as any)?.type);
              break;
            case 'process-manager':
              console.log(`[${t}] 🔄 ${entry.manager} →`, entry.commands.length, 'cmd(s)');
              break;
            case 'error':
              console.error(`[${t}] ❌ ${entry.phase}`, entry.error);
              break;
          }
        })
      );
    }
  }

  addDecider<TCommand, TState, TContext, TEvent>(
    config: DeciderConfig<TCommand, TState, TContext, TEvent>
  ): Decider<TCommand, TState, TEvent> {
    // Validate unique decider name
    if (this.deciders.has(config.name)) {
      throw new Error(`Decider with name '${config.name}' already exists`);
    }
    
    const decider = createDecider(config, this.trace);
    this.deciders.set(config.name, decider);

    // Forward to system-wide event bus
    this.cleanups.push(
      decider.events.subscribe((event) =>
        this.allEvents.emit({ decider: config.name, event })
      )
    );

    return decider;
  }

  addProjector<TReadState, TEvent>(
    config: ProjectorConfig<TReadState, TEvent>,
    source: Decider<any, any, TEvent>
  ): Projector<TReadState> {
    const projector = createProjector(config, source.events, this.trace);
    this.cleanups.push(projector.destroy);
    return projector;
  }

  addGlobalProjector<TReadState>(
    config: ProjectorConfig<TReadState, { decider: string; event: any }>
  ): Projector<TReadState> {
    const projector = createProjector(config, this.allEvents, this.trace);
    this.cleanups.push(projector.destroy);
    return projector;
  }

  addProcessManager<TEvent, TCommand>(
    config: ProcessManagerConfig<TEvent, TCommand>,
    source: Decider<any, any, TEvent>,
    target: Decider<TCommand, any, any>
  ): void {
    const unsub = createProcessManager(
      config,
      source.events,
      (cmd) => target.dispatch(cmd),
      this.trace
    );
    this.cleanups.push(unsub);
  }

  destroy(): void {
    this.cleanups.forEach((fn) => fn());
  }
}

// ============================================================
// Computed helpers — derive values from decider state
// ============================================================

/**
 * Create a derived signal from a decider's state.
 * Like useSelector but without hooks — just use .value in JSX.
 *
 * const operationalLabs = select(laboratory, s =>
 *   Object.values(s.laboratories).filter(l => l.status.kind === 'Operational')
 * );
 *
 * // In JSX:
 * <span>{operationalLabs.value.length} operational</span>
 */
export function select<TState, TSelected>(
  decider: Decider<any, TState, any>,
  selector: (state: TState) => TSelected
): ReadonlySignal<TSelected> {
  return computed(() => selector(decider.state.value));
}

// ============================================================
// React-specific System (includes auto-import)
// ============================================================

export class ReactSystem extends System {
  constructor(enableConsoleTrace = false) {
    super(enableConsoleTrace);
    
    // Ensure React integration is loaded
    if (typeof window !== 'undefined' && !window.__PROTOPAL_REACT_AUTO_IMPORTED__) {
      console.warn(
        'Protopal ReactSystem: React integration not detected. ' +
        'Add `import "@preact/signals-react/auto"` to your app entry point for best performance.'
      );
    }
  }
}

// TypeScript global augmentation for the auto-import flag
declare global {
  interface Window {
    __PROTOPAL_REACT_AUTO_IMPORTED__?: boolean;
  }
}