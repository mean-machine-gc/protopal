import { System, select, type DeciderConfig } from 'protopal';
import { computed } from '@preact/signals-react';
import type { EntityId, Item, ItemStatus, ItemName, Timestamp } from './model';

// Commands - what users want to do (using discriminated unions)
type ItemCommand =
  | { type: 'CreateItem'; payload: { name: ItemName } }
  | { type: 'CompleteItem'; payload: { id: EntityId } }
  | { type: 'ArchiveItem'; payload: { id: EntityId; reason: string } }
  | { type: 'ReactivateItem'; payload: { id: EntityId } }
  | { type: 'DeleteItem'; payload: { id: EntityId } };

// Events - what actually happened (more events than commands due to business rules)
type ItemEvent =
  | { type: 'ItemCreated'; payload: { id: EntityId; name: ItemName; createdAt: Timestamp } }
  | { type: 'ItemCompleted'; payload: { id: EntityId; completedAt: Timestamp } }
  | { type: 'ItemArchived'; payload: { id: EntityId; archivedAt: Timestamp; reason: string } }
  | { type: 'ItemReactivated'; payload: { id: EntityId; updatedAt: Timestamp } }
  | { type: 'ItemDeleted'; payload: { id: EntityId } }
  | { type: 'ItemCommandFailed'; payload: { command: string; reason: string } };

// State
type ItemState = {
  items: Record<EntityId, Item>;
};

// Context
type ItemContext = {
  timestamp: string;
  userId?: string;
};

// Define your first decider
const itemDecider: DeciderConfig<ItemCommand, ItemState, ItemContext, ItemEvent> = {
  name: 'Items',
  initialState: { items: {} },
  
  resolveContext: async () => ({
    timestamp: new Date().toISOString(),
    // In production, get user from auth
  }),
  
  decide: (cmd, state, ctx) => {
    switch (cmd.type) {
      case 'CreateItem': {
        const id = crypto.randomUUID();
        return [{
          type: 'ItemCreated',
          payload: {
            id,
            name: cmd.payload.name,
            createdAt: ctx.timestamp,
          }
        }];
      }
      
      case 'CompleteItem': {
        const item = state.items[cmd.payload.id];
        if (!item) {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: 'Item not found' }
          }];
        }
        if (item.status.kind !== 'Active') {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: `Cannot complete ${item.status.kind} item` }
          }];
        }
        return [{ 
          type: 'ItemCompleted', 
          payload: { id: cmd.payload.id, completedAt: ctx.timestamp } 
        }];
      }
      
      case 'ArchiveItem': {
        const item = state.items[cmd.payload.id];
        if (!item) {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: 'Item not found' }
          }];
        }
        if (item.status.kind === 'Archived') {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: 'Item already archived' }
          }];
        }
        return [{ 
          type: 'ItemArchived', 
          payload: { 
            id: cmd.payload.id, 
            archivedAt: ctx.timestamp,
            reason: cmd.payload.reason 
          } 
        }];
      }
      
      case 'ReactivateItem': {
        const item = state.items[cmd.payload.id];
        if (!item) {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: 'Item not found' }
          }];
        }
        if (item.status.kind === 'Active') {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: 'Item already active' }
          }];
        }
        return [{ 
          type: 'ItemReactivated', 
          payload: { id: cmd.payload.id, updatedAt: ctx.timestamp } 
        }];
      }
      
      case 'DeleteItem': {
        if (!state.items[cmd.payload.id]) {
          return [{
            type: 'ItemCommandFailed',
            payload: { command: cmd.type, reason: 'Item not found' }
          }];
        }
        return [{ type: 'ItemDeleted', payload: cmd.payload }];
      }
      
      default:
        return [];
    }
  },
  
  evolve: (state, event) => {
    switch (event.type) {
      case 'ItemCreated':
        return {
          items: {
            ...state.items,
            [event.payload.id]: {
              id: event.payload.id,
              name: event.payload.name,
              status: { kind: 'Active' },
              createdAt: event.payload.createdAt,
              updatedAt: event.payload.createdAt,
            }
          }
        };
        
      case 'ItemCompleted':
        return {
          items: {
            ...state.items,
            [event.payload.id]: {
              ...state.items[event.payload.id],
              status: { kind: 'Completed', completedAt: event.payload.completedAt },
              updatedAt: event.payload.completedAt,
            }
          }
        };
        
      case 'ItemArchived':
        return {
          items: {
            ...state.items,
            [event.payload.id]: {
              ...state.items[event.payload.id],
              status: { 
                kind: 'Archived', 
                archivedAt: event.payload.archivedAt,
                reason: event.payload.reason 
              },
              updatedAt: event.payload.archivedAt,
            }
          }
        };
        
      case 'ItemReactivated':
        return {
          items: {
            ...state.items,
            [event.payload.id]: {
              ...state.items[event.payload.id],
              status: { kind: 'Active' },
              updatedAt: event.payload.updatedAt,
            }
          }
        };
        
      case 'ItemDeleted': {
        const { [event.payload.id]: _, ...remaining } = state.items;
        return { items: remaining };
      }
      
      case 'ItemCommandFailed':
        return state;
        
      default:
        return state;
    }
  },
};

// Create and wire your system
export const system = new System(true); // true = enable console tracing
export const items = system.addDecider(itemDecider);

// Create derived signals (computed values)
export const itemList = select(items, state => Object.values(state.items));
export const itemCount = select(items, state => Object.keys(state.items).length);

// Filtered lists by status
export const activeItems = select(items, state => 
  Object.values(state.items).filter(item => item.status.kind === 'Active')
);

export const completedItems = select(items, state => 
  Object.values(state.items).filter(item => item.status.kind === 'Completed')
);

export const archivedItems = select(items, state => 
  Object.values(state.items).filter(item => item.status.kind === 'Archived')
);

// Statistics
export const stats = computed(() => {
  const all = itemList.value;
  return {
    total: all.length,
    active: activeItems.value.length,
    completed: completedItems.value.length,
    archived: archivedItems.value.length,
  };
});