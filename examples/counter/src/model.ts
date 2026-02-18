/**
 * Counter Domain Model
 * ====================
 * 
 * Demonstrates discriminated unions for better type safety
 */

/** @format uuid */
export type CounterId = string;

/** @format date-time */
export type Timestamp = string;

/** @minimum 0 */
export type Count = number;

/** @minimum 1 */
export type Increment = number;

// Counter can be in different modes with mode-specific data
export type CounterMode =
  | { 
      kind: 'Counting';
      startedAt: Timestamp;
    }
  | { 
      kind: 'Countdown';
      targetValue: Count;
      targetReachedAt?: Timestamp;
    }
  | {
      kind: 'Paused';
      pausedAt: Timestamp;
      previousMode: 'Counting' | 'Countdown';
    };

// History entries use discriminated unions for different event types
export type HistoryEntry =
  | {
      kind: 'Incremented';
      amount: Increment;
      newValue: Count;
      timestamp: Timestamp;
    }
  | {
      kind: 'Decremented';
      amount: Increment;
      newValue: Count;
      timestamp: Timestamp;
    }
  | {
      kind: 'Reset';
      previousValue: Count;
      timestamp: Timestamp;
    }
  | {
      kind: 'ModeChanged';
      from: CounterMode['kind'];
      to: CounterMode['kind'];
      timestamp: Timestamp;
    }
  | {
      kind: 'TargetReached';
      value: Count;
      timestamp: Timestamp;
    };

// Main counter state
export type Counter = {
  id: CounterId;
  value: Count;
  mode: CounterMode;
  clicks: number;
  history: HistoryEntry[];
  createdAt: Timestamp;
};