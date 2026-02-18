import { System, select, type DeciderConfig } from 'protopal';
import { z, createCommandSchema } from 'protopal/validation';
import { computed } from '@preact/signals-react';
import type { Counter, CounterMode, HistoryEntry, Timestamp } from './model';

// Commands - using discriminated unions
type CounterCommand = 
  | { type: 'Increment'; payload: { amount: number } }
  | { type: 'Decrement'; payload: { amount: number } }
  | { type: 'Reset' }
  | { type: 'SetCountdownTarget'; payload: { target: number } }
  | { type: 'ChangeMode'; payload: { mode: 'counting' | 'countdown' } }
  | { type: 'Pause' }
  | { type: 'Resume' };

// Events - what actually happened
type CounterEvent =
  | { type: 'Incremented'; payload: { amount: number; newValue: number; timestamp: Timestamp } }
  | { type: 'Decremented'; payload: { amount: number; newValue: number; timestamp: Timestamp } }
  | { type: 'Reset'; payload: { previousValue: number; timestamp: Timestamp } }
  | { type: 'CountdownTargetSet'; payload: { target: number; timestamp: Timestamp } }
  | { type: 'ModeChanged'; payload: { from: CounterMode['kind']; to: 'Counting' | 'Countdown'; timestamp: Timestamp } }
  | { type: 'Paused'; payload: { mode: 'Counting' | 'Countdown'; timestamp: Timestamp } }
  | { type: 'Resumed'; payload: { timestamp: Timestamp } }
  | { type: 'TargetReached'; payload: { value: number; timestamp: Timestamp } }
  | { type: 'CounterCommandFailed'; payload: { command: string; reason: string } };

// State is now just a Counter
type CounterState = Counter;

// Context
type CounterContext = {
  timestamp: Timestamp;
};

// Command validation schema
const counterCommandSchema = createCommandSchema([
  { 
    type: 'Increment', 
    payload: z.object({
      amount: z.number()
        .min(1, 'Amount must be at least 1')
        .max(100, 'Amount cannot exceed 100')
    })
  },
  { 
    type: 'Decrement', 
    payload: z.object({
      amount: z.number()
        .min(1, 'Amount must be at least 1')
        .max(100, 'Amount cannot exceed 100')
    })
  },
  { type: 'Reset' },
  { 
    type: 'SetCountdownTarget', 
    payload: z.object({
      target: z.number()
        .min(1, 'Target must be at least 1')
        .max(1000, 'Target cannot exceed 1000')
    })
  },
  { 
    type: 'ChangeMode', 
    payload: z.object({
      mode: z.enum(['counting', 'countdown'])
    })
  },
  { type: 'Pause' },
  { type: 'Resume' },
]);

// Create the counter decider
const counterDecider: DeciderConfig<CounterCommand, CounterState, CounterContext, CounterEvent> = {
  name: 'Counter',
  commandSchema: counterCommandSchema,
  initialState: {
    id: crypto.randomUUID(),
    value: 0,
    mode: { kind: 'Counting', startedAt: new Date().toISOString() },
    clicks: 0,
    history: [],
    createdAt: new Date().toISOString(),
  },
  
  resolveContext: async (): Promise<CounterContext> => ({
    timestamp: new Date().toISOString(),
  }),
  
  decide: (cmd, state, ctx) => {
    switch (cmd.type) {
      case 'Increment': {
        const newValue = state.value + cmd.payload.amount;
        const events: CounterEvent[] = [{ 
          type: 'Incremented', 
          payload: { amount: cmd.payload.amount, newValue, timestamp: ctx.timestamp } 
        }];
        
        // Check if we reached the target in countdown mode
        if (state.mode.kind === 'Countdown' && newValue >= state.mode.targetValue) {
          events.push({ 
            type: 'TargetReached', 
            payload: { value: newValue, timestamp: ctx.timestamp } 
          });
        }
        
        return events;
      }
        
      case 'Decrement': {
        if (state.value - cmd.payload.amount < 0) {
          return [{ 
            type: 'CounterCommandFailed', 
            payload: { command: cmd.type, reason: 'Cannot go below zero' } 
          }];
        }
        const newValue = state.value - cmd.payload.amount;
        return [{ 
          type: 'Decremented', 
          payload: { amount: cmd.payload.amount, newValue, timestamp: ctx.timestamp } 
        }];
      }
        
      case 'Reset':
        return [{ 
          type: 'Reset', 
          payload: { previousValue: state.value, timestamp: ctx.timestamp } 
        }];
        
      case 'SetCountdownTarget': {
        if (state.mode.kind !== 'Countdown') {
          return [{
            type: 'CounterCommandFailed',
            payload: { command: cmd.type, reason: 'Not in countdown mode' }
          }];
        }
        if (cmd.payload.target <= 0) {
          return [{ 
            type: 'CounterCommandFailed', 
            payload: { command: cmd.type, reason: 'Target must be positive' } 
          }];
        }
        return [{ 
          type: 'CountdownTargetSet', 
          payload: { target: cmd.payload.target, timestamp: ctx.timestamp } 
        }];
      }
      
      case 'ChangeMode': {
        if (state.mode.kind === 'Paused') {
          return [];
        }
        if (state.mode.kind === 'Counting' && cmd.payload.mode === 'counting' ||
            state.mode.kind === 'Countdown' && cmd.payload.mode === 'countdown') {
          return []; // Already in this mode
        }
        return [{
          type: 'ModeChanged',
          payload: { from: state.mode.kind, to: cmd.payload.mode, timestamp: ctx.timestamp }
        }];
      }
      
      case 'Pause': {
        if (state.mode.kind === 'Paused') {
          return [];
        }
        const currentMode = state.mode.kind as 'Counting' | 'Countdown';
        return [{
          type: 'Paused',
          payload: { mode: currentMode, timestamp: ctx.timestamp }
        }];
      }
      
      case 'Resume': {
        if (state.mode.kind !== 'Paused') {
          return [{
            type: 'CounterCommandFailed',
            payload: { command: cmd.type, reason: 'Not paused' }
          }];
        }
        return [{ type: 'Resumed', payload: { timestamp: ctx.timestamp } }];
      }
        
      default:
        return [];
    }
  },
  
  evolve: (state, event) => {
    // Helper to add history entry
    const addHistory = (entry: HistoryEntry): HistoryEntry[] => 
      [...state.history, entry].slice(-20); // Keep last 20

    switch (event.type) {
      case 'Incremented':
        return {
          ...state,
          value: event.payload.newValue,
          clicks: state.clicks + 1,
          history: addHistory({
            kind: 'Incremented',
            amount: event.payload.amount,
            newValue: event.payload.newValue,
            timestamp: event.payload.timestamp,
          }),
        };
        
      case 'Decremented':
        return {
          ...state,
          value: event.payload.newValue,
          clicks: state.clicks + 1,
          history: addHistory({
            kind: 'Decremented',
            amount: event.payload.amount,
            newValue: event.payload.newValue,
            timestamp: event.payload.timestamp,
          }),
        };
        
      case 'Reset':
        return {
          ...state,
          value: 0,
          clicks: state.clicks + 1,
          history: addHistory({
            kind: 'Reset',
            previousValue: event.payload.previousValue,
            timestamp: event.payload.timestamp,
          }),
        };
        
      case 'CountdownTargetSet':
        if (state.mode.kind === 'Countdown') {
          return {
            ...state,
            mode: {
              ...state.mode,
              targetValue: event.payload.target,
            },
          };
        }
        return state;
        
      case 'ModeChanged':
        return {
          ...state,
          mode: event.payload.to === 'counting'
            ? { kind: 'Counting', startedAt: event.payload.timestamp }
            : { kind: 'Countdown', targetValue: 10 }, // Default target
          history: addHistory({
            kind: 'ModeChanged',
            from: event.payload.from,
            to: event.payload.to === 'counting' ? 'Counting' : 'Countdown',
            timestamp: event.payload.timestamp,
          }),
        };
        
      case 'Paused':
        return {
          ...state,
          mode: {
            kind: 'Paused',
            pausedAt: event.payload.timestamp,
            previousMode: event.payload.mode,
          },
        };
        
      case 'Resumed':
        if (state.mode.kind === 'Paused') {
          return {
            ...state,
            mode: state.mode.previousMode === 'Counting'
              ? { kind: 'Counting', startedAt: event.payload.timestamp }
              : { kind: 'Countdown', targetValue: 10 },
          };
        }
        return state;
        
      case 'TargetReached':
        if (state.mode.kind === 'Countdown') {
          return {
            ...state,
            mode: {
              ...state.mode,
              targetReachedAt: event.payload.timestamp,
            },
            history: addHistory({
              kind: 'TargetReached',
              value: event.payload.value,
              timestamp: event.payload.timestamp,
            }),
          };
        }
        return state;
        
      case 'CounterCommandFailed':
        return state;
        
      default:
        return state;
    }
  },
};

// Create system and wire everything
export const system = new System(true);
export const counter = system.addDecider(counterDecider);

// Derived signals
export const isPositive = select(counter, s => s.value > 0);

export const currentMode = select(counter, s => s.mode.kind);

export const isPaused = select(counter, s => s.mode.kind === 'Paused');

export const isInCountdown = select(counter, s => s.mode.kind === 'Countdown');

export const countdownProgress = computed(() => {
  const state = counter.state.value;
  if (state.mode.kind !== 'Countdown') return 0;
  
  const target = state.mode.targetValue;
  return target === 0 ? 0 : Math.min(100, (state.value / target) * 100);
});

export const hasReachedTarget = computed(() => {
  const state = counter.state.value;
  return state.mode.kind === 'Countdown' && 
         state.mode.targetReachedAt !== undefined;
});

export const average = computed(() => {
  const state = counter.state.value;
  return state.clicks === 0 ? 0 : state.value / state.clicks;
});

export const recentHistory = select(counter, s => s.history.slice(-5));