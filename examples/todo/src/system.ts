/**
 * Todo System
 * ===========
 * 
 * Simple todo list demonstrating protopal basics
 */

import { System, select, type DeciderConfig } from 'protopal';
import { z, createCommandSchema } from 'protopal/validation';
import { computed } from '@preact/signals-react';
import type { Todo, TodoId, Timestamp, TodoStatus } from './model';

// Commands - what users want to do
type TodoCommand =
  | { type: 'AddTodo'; payload: { id: TodoId; text: string } }
  | { type: 'CompleteTodo'; payload: { id: TodoId } }
  | { type: 'ReactivateTodo'; payload: { id: TodoId } }
  | { type: 'ArchiveTodo'; payload: { id: TodoId } }
  | { type: 'UpdateTodoText'; payload: { id: TodoId; text: string } };

// Events - what actually happened
type TodoEvent =
  | { type: 'TodoAdded'; payload: { id: TodoId; text: string; createdAt: Timestamp } }
  | { type: 'TodoCompleted'; payload: { id: TodoId; completedAt: Timestamp } }
  | { type: 'TodoReactivated'; payload: { id: TodoId; reactivatedAt: Timestamp } }
  | { type: 'TodoArchived'; payload: { id: TodoId; archivedAt: Timestamp } }
  | { type: 'TodoTextUpdated'; payload: { id: TodoId; text: string; updatedAt: Timestamp } }
  | { type: 'TodoCommandFailed'; payload: { command: string; reason: string } };

type TodoState = {
  todos: Record<TodoId, Todo>;
};

type TodoContext = {
  timestamp: Timestamp;
};

// Command validation schema
const todoCommandSchema = createCommandSchema([
  {
    type: 'AddTodo',
    payload: z.object({
      id: z.string().min(1, 'ID is required'),
      text: z.string()
        .min(1, 'Todo text cannot be empty')
        .max(500, 'Todo text must be less than 500 characters')
    })
  },
  {
    type: 'CompleteTodo',
    payload: z.object({
      id: z.string().min(1, 'ID is required')
    })
  },
  {
    type: 'ReactivateTodo',
    payload: z.object({
      id: z.string().min(1, 'ID is required')
    })
  },
  {
    type: 'ArchiveTodo',
    payload: z.object({
      id: z.string().min(1, 'ID is required')
    })
  },
  {
    type: 'UpdateTodoText',
    payload: z.object({
      id: z.string().min(1, 'ID is required'),
      text: z.string()
        .min(1, 'Todo text cannot be empty')
        .max(500, 'Todo text must be less than 500 characters')
    })
  },
]);

// Todo decider - contains all business rules
const todoDecider: DeciderConfig<TodoCommand, TodoState, TodoContext, TodoEvent> = {
  name: 'Todo',
  commandSchema: todoCommandSchema,
  initialState: { todos: {} },
  
  resolveContext: async (): Promise<TodoContext> => ({
    timestamp: new Date().toISOString(),
  }),
  
  decide: (cmd, state, ctx) => {
    switch (cmd.type) {
      case 'AddTodo': {
        if (state.todos[cmd.payload.id]) {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo already exists' } 
          }];
        }
        return [{ 
          type: 'TodoAdded', 
          payload: { ...cmd.payload, createdAt: ctx.timestamp } 
        }];
      }
        
      case 'CompleteTodo': {
        const todo = state.todos[cmd.payload.id];
        if (!todo) {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo not found' } 
          }];
        }
        if (todo.status.kind !== 'Active') {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo is not active' } 
          }];
        }
        return [{ 
          type: 'TodoCompleted', 
          payload: { id: cmd.payload.id, completedAt: ctx.timestamp } 
        }];
      }
        
      case 'ReactivateTodo': {
        const todo = state.todos[cmd.payload.id];
        if (!todo) {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo not found' } 
          }];
        }
        if (todo.status.kind !== 'Completed') {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo is not completed' } 
          }];
        }
        return [{ 
          type: 'TodoReactivated', 
          payload: { id: cmd.payload.id, reactivatedAt: ctx.timestamp } 
        }];
      }
        
      case 'ArchiveTodo': {
        const todo = state.todos[cmd.payload.id];
        if (!todo) {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo not found' } 
          }];
        }
        if (todo.status.kind === 'Archived') {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo already archived' } 
          }];
        }
        return [{ 
          type: 'TodoArchived', 
          payload: { id: cmd.payload.id, archivedAt: ctx.timestamp } 
        }];
      }
        
      case 'UpdateTodoText': {
        const todo = state.todos[cmd.payload.id];
        if (!todo) {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Todo not found' } 
          }];
        }
        if (todo.status.kind === 'Archived') {
          return [{ 
            type: 'TodoCommandFailed', 
            payload: { command: cmd.type, reason: 'Cannot edit archived todo' } 
          }];
        }
        return [{ 
          type: 'TodoTextUpdated', 
          payload: { ...cmd.payload, updatedAt: ctx.timestamp } 
        }];
      }
        
      default:
        return [];
    }
  },
  
  evolve: (state, event) => {
    switch (event.type) {
      case 'TodoAdded':
        return {
          ...state,
          todos: {
            ...state.todos,
            [event.payload.id]: {
              id: event.payload.id,
              text: event.payload.text,
              status: { kind: 'Active', createdAt: event.payload.createdAt },
            },
          },
        };
        
      case 'TodoCompleted':
        return {
          ...state,
          todos: {
            ...state.todos,
            [event.payload.id]: {
              ...state.todos[event.payload.id],
              status: { kind: 'Completed', completedAt: event.payload.completedAt },
            },
          },
        };
        
      case 'TodoReactivated':
        return {
          ...state,
          todos: {
            ...state.todos,
            [event.payload.id]: {
              ...state.todos[event.payload.id],
              status: { kind: 'Active', createdAt: event.payload.reactivatedAt },
            },
          },
        };
        
      case 'TodoArchived':
        return {
          ...state,
          todos: {
            ...state.todos,
            [event.payload.id]: {
              ...state.todos[event.payload.id],
              status: { kind: 'Archived', archivedAt: event.payload.archivedAt },
            },
          },
        };
        
      case 'TodoTextUpdated':
        return {
          ...state,
          todos: {
            ...state.todos,
            [event.payload.id]: {
              ...state.todos[event.payload.id],
              text: event.payload.text,
            },
          },
        };
        
      case 'TodoCommandFailed':
        return state;
        
      default:
        return state;
    }
  },
};

// Create system and wire everything
export const system = new System(true);
export const todo = system.addDecider(todoDecider);

// Derived signals - use .value in JSX
export const activeTodos = select(todo, s =>
  Object.values(s.todos).filter(t => t.status.kind === 'Active')
);

export const completedTodos = select(todo, s =>
  Object.values(s.todos).filter(t => t.status.kind === 'Completed')
);

export const archivedTodos = select(todo, s =>
  Object.values(s.todos).filter(t => t.status.kind === 'Archived')
);

export const totalTodos = computed(() => Object.keys(todo.state.value.todos).length);

export const completionStats = computed(() => {
  const total = totalTodos.value;
  const completed = completedTodos.value.length;
  return {
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
});