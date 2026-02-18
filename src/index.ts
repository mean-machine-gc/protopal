/**
 * Protopal - Event Sourcing Runtime for React
 * 
 * A signals-based event sourcing runtime for prototyping domain models
 * through interactive React applications.
 */

// Core runtime exports
export {
  // Main classes
  System,
  ReactSystem,
  EventBus,
  
  // Helper functions
  createDecider,
  createProjector,
  createProcessManager,
  select,
  
  // Types
  type Decide,
  type Evolve,
  type ResolveContext,
  type Project,
  type React,
  type DeciderConfig,
  type Decider,
  type ProjectorConfig,
  type Projector,
  type ProcessManagerConfig,
  type TraceEntry,
  type Listener,
  type Unsubscribe,
} from './protopal';

// Validation exports
export {
  z,
  createCommandSchema,
  validateCommandPayload,
  getCommandPayloadSchema,
  createFormValidator,
  formatValidationErrors,
  getFieldErrorMessage,
  type ValidationError,
  type ValidationResult,
  type ZodError,
  type ZodIssue,
  type ZodSchema,
} from './validation';

// Persistence exports
export {
  LocalStorageAdapter,
  type PersistenceAdapter,
} from './persistence';

// Re-export signals for convenience
export { signal, computed, effect } from '@preact/signals-react';
export type { Signal, ReadonlySignal } from '@preact/signals-react';