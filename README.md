# Protopal

**Agent-friendly** event sourcing runtime for prototyping domain models through interactive React applications.

## What is Protopal?

Protopal helps you discover domain models by building working prototypes that domain experts can interact with. The prototype isn't throwaway — it runs the same event sourcing pattern (command → decide → event → evolve → state) that your backend will implement.

## For AI Agents 🤖

**Protopal is designed agents-first** for interactive domain discovery. As an AI agent, you can rapidly prototype domain models by building working React applications that domain experts can immediately interact with and validate.

### Agent Workflow

1. **Receive domain description** from domain expert or requirements
2. **Build working prototype** using Protopal's event sourcing patterns
3. **Domain expert validates** by interacting with the live application
4. **Iterate based on feedback** - modify the model, see changes instantly
5. **Extract production artifacts** - the domain model is ready for backend implementation

### Quick Agent Start

```bash
npx create-protopal-app my-domain-prototype
```

### Four Key Artifacts You Create

As an agent, you maintain these four files in sync as the prototype evolves:

1. **`model.ts`** - Domain types using discriminated unions
2. **`deciders/`** - Business logic (decide + evolve functions)  
3. **`system.ts`** - Wire deciders, process managers, projectors
4. **`components/`** - React UI with trace panel for debugging

### Learning from Examples

Study these working examples in the repository:
- **[Counter](https://github.com/mean-machine-gc/protopal/tree/main/examples/counter)** - Basic concepts with validation
- **[Todo](https://github.com/mean-machine-gc/protopal/tree/main/examples/todo)** - CRUD with state transitions
- **[Ecommerce](https://github.com/mean-machine-gc/protopal/tree/main/examples/ecommerce)** - Complex domain with process managers

### Complete Agent Guide

📖 **[Read the comprehensive agent instructions →](https://github.com/mean-machine-gc/protopal/blob/main/AGENT.md)**

The AGENT.md file contains detailed patterns, examples, and best practices for building domain prototypes.

---

### Key Features

- **Event Sourcing Architecture**: Commands, events, deciders, and projectors
- **Signals-Based State**: Automatic UI updates without React hooks
- **Process Managers**: Coordinate workflows across aggregates
- **Built-in Tracing**: See every command and event in real-time
- **TypeScript First**: Full type safety across your domain model
- **Zero Boilerplate**: Focus on your domain, not infrastructure
- **Command Validation**: Optional Zod schemas for runtime validation

## For Developers

### Installation

```bash
npm install protopal
```

### Basic Example

```typescript
// model.ts - Define your domain
export type Counter = {
  value: number;
  clicks: number;
};

// system.ts - Wire your system
import { System, select } from 'protopal';
import { computed } from '@preact/signals-react';

// Define commands and events using discriminated unions
type CounterCommand = 
  | { type: 'Increment'; payload: { amount: number } }
  | { type: 'Decrement'; payload: { amount: number } }
  | { type: 'Reset' }
  | { type: 'SetMode'; payload: { mode: 'counting' | 'countdown' } };

type CounterEvent =
  | { type: 'Incremented'; payload: { amount: number } }
  | { type: 'Decremented'; payload: { amount: number } }
  | { type: 'Reset' }
  | { type: 'ModeChanged'; payload: { mode: 'counting' | 'countdown' } }
  | { type: 'CounterCommandFailed'; payload: { reason: string } };

// Create decider
const counterDecider = {
  name: 'Counter',
  initialState: { value: 0, clicks: 0 },
  
  decide: (cmd, state) => {
    switch (cmd.type) {
      case 'Increment':
        return [{ type: 'Incremented', payload: cmd.payload }];
      case 'Decrement':
        if (state.value - cmd.payload.amount < 0) return [];
        return [{ type: 'Decremented', payload: cmd.payload }];
      case 'Reset':
        return [{ type: 'Reset' }];
    }
  },
  
  evolve: (state, event) => {
    switch (event.type) {
      case 'Incremented':
        return { value: state.value + event.payload.amount, clicks: state.clicks + 1 };
      case 'Decremented':
        return { value: state.value - event.payload.amount, clicks: state.clicks + 1 };
      case 'Reset':
        return { value: 0, clicks: 0 };
    }
  },
  
  resolveContext: async () => ({}),
};

// Wire the system
const system = new System(true); // true = enable console tracing
const counter = system.addDecider(counterDecider);

// Create derived signals
const isPositive = select(counter, s => s.value > 0);
const clicksPerValue = computed(() => 
  counter.state.value.value === 0 ? 0 : counter.state.value.clicks / counter.state.value.value
);

export { system, counter, isPositive, clicksPerValue };
```

### React Component (No Hooks!)

```tsx
import React from 'react';
import { counter, isPositive } from './system';

function Counter() {
  return (
    <div>
      <h1>Count: {counter.state.value.value}</h1>
      <p>Total clicks: {counter.state.value.clicks}</p>
      <p>{isPositive.value ? 'Positive!' : 'Zero or negative'}</p>
      
      <button onClick={() => counter.dispatch({ type: 'Increment', payload: { amount: 1 } })}>
        +1
      </button>
      <button onClick={() => counter.dispatch({ type: 'Decrement', payload: { amount: 1 } })}>
        -1
      </button>
      <button onClick={() => counter.dispatch({ type: 'Reset' })}>
        Reset
      </button>
    </div>
  );
}
```

## Core Concepts

### 1. Domain Modeling with Discriminated Unions

Protopal encourages modeling your domain with discriminated unions for maximum type safety and readability:

```typescript
// ✅ GOOD: Model states as discriminated unions
type OrderStatus =
  | { kind: 'Draft'; items: ItemId[] }
  | { kind: 'Submitted'; submittedAt: Timestamp; total: Price }
  | { kind: 'Paid'; paidAt: Timestamp; paymentId: string }
  | { kind: 'Shipped'; shippedAt: Timestamp; trackingNumber: string }
  | { kind: 'Delivered'; deliveredAt: Timestamp }
  | { kind: 'Cancelled'; cancelledAt: Timestamp; reason: string };

// ❌ BAD: Avoid nullable fields and boolean flags
type BadOrderStatus = {
  isDraft: boolean;
  isSubmitted: boolean;
  submittedAt?: Timestamp;
  paymentId?: string;
  trackingNumber?: string;
  // This leads to invalid combinations!
};
```

**Benefits:**
- **Type Safety**: Can't access `trackingNumber` unless order is 'Shipped'
- **Exhaustive Checks**: TypeScript ensures all cases handled
- **Self-Documenting**: Types tell the complete story
- **Human Readable**: `status.kind === 'Shipped'` vs checking multiple flags

### 2. Deciders

Deciders are the heart of your domain model:

- **decide**: Pure function containing all business rules
- **evolve**: Pure function that applies events to state
- **resolveContext**: Async boundary for external data

### 3. Process Managers

Coordinate workflows across aggregates:

```typescript
const orderFulfillment = {
  name: 'OrderFulfillment',
  filter: (event) => event.type === 'OrderPaid',
  react: (event) => [
    { type: 'ReserveInventory', payload: { orderId: event.payload.orderId } },
    { type: 'NotifyWarehouse', payload: { orderId: event.payload.orderId } },
  ],
};

system.addProcessManager(orderFulfillment, orders, inventory);
```

### 4. Projectors

Build read models from events:

```typescript
const dashboard = {
  name: 'Dashboard',
  initialState: { totalOrders: 0, revenue: 0 },
  project: (state, event) => {
    if (event.type === 'OrderCreated') {
      return {
        totalOrders: state.totalOrders + 1,
        revenue: state.revenue + event.payload.total,
      };
    }
    return state;
  },
};

const dashboardView = system.addGlobalProjector(dashboard);
```

### 5. Signals & Derived State

No React hooks needed:

```typescript
// Derived signals
const activeOrders = select(orders, state => 
  state.orders.filter(o => o.status === 'active')
);

// Computed across multiple sources
const systemStats = computed(() => ({
  orders: orders.state.value.count,
  inventory: inventory.state.value.totalItems,
  revenue: dashboard.state.value.revenue,
}));

// Use in components - auto re-renders!
<div>{activeOrders.value.length} active orders</div>
```

### 6. Command Validation (Optional)

Add Zod schemas for runtime validation and better error messages:

```typescript
import { z, createCommandSchema } from 'protopal/validation';

// Define command validation schema
const orderCommandSchema = createCommandSchema([
  {
    type: 'CreateOrder',
    payload: z.object({
      items: z.array(z.object({
        productId: z.string().uuid(),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        price: z.number().positive('Price must be positive'),
      })).min(1, 'Order must have at least one item'),
      customerId: z.string().uuid('Invalid customer ID'),
    })
  },
  {
    type: 'CancelOrder',
    payload: z.object({
      orderId: z.string().uuid(),
      reason: z.string().min(10, 'Please provide a detailed reason'),
    })
  },
  { type: 'SubmitOrder' }, // Commands without payload
]);

// Add to your decider
const orderDecider = {
  name: 'Orders',
  commandSchema: orderCommandSchema,
  // ... rest of config
};
```

#### Form Validation Example

```tsx
import { getCommandPayloadSchema, formatValidationErrors } from 'protopal/validation';

function CreateOrderForm() {
  const [errors, setErrors] = useState<string[]>([]);
  
  const validateAndSubmit = (formData: FormData) => {
    // Get schema for specific command
    const schema = getCommandPayloadSchema(
      orderDecider.commandSchema,
      'CreateOrder'
    );
    
    if (schema) {
      const result = schema.safeParse(formData);
      if (!result.success) {
        setErrors(formatValidationErrors(result.error.format()));
        return;
      }
    }
    
    // Valid! Dispatch command
    orders.dispatch({
      type: 'CreateOrder',
      payload: formData
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {errors.map(err => <div className="error">{err}</div>)}
    </form>
  );
}
```

## React Integration

Import the React integration at your app's entry point:

```typescript
// main.tsx
import '@preact/signals-react/auto';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

## Trace Panel

Always include the trace panel during development:

```tsx
function TracePanel() {
  const entries = system.traceLog.value;
  return (
    <details className="trace-panel">
      <summary>Trace ({entries.length})</summary>
      {entries.map((entry, i) => (
        <div key={i}>
          {entry.kind === 'command' && `⌘ ${entry.command.type}`}
          {entry.kind === 'event' && `⚡ ${entry.event.type}`}
          {/* ... */}
        </div>
      ))}
    </details>
  );
}
```

## Best Practices

### DO
- ✅ Define all types in model.ts first
- ✅ Keep commands and events as separate types
- ✅ Put all business rules in decide()
- ✅ Keep evolve() pure with no guards
- ✅ Use process managers for cross-aggregate flows
- ✅ Include the trace panel
- ✅ Use Zod schemas for command validation when needed
- ✅ Model domain states as discriminated unions

### DON'T
- ❌ Use React hooks for domain state
- ❌ Put business logic in components
- ❌ Add guards in evolve()
- ❌ Dispatch to multiple aggregates directly

## Examples

Check out the `/examples` directory:
- **counter**: Simple counter with derived state
- **todo**: Todo list with persistence
- **ecommerce**: Full shopping cart with process managers

## API Reference

### System

```typescript
const system = new System(enableTracing?: boolean);
```

### Decider

```typescript
interface DeciderConfig<TCommand, TState, TContext, TEvent> {
  name: string;
  initialState: TState;
  commandSchema?: z.ZodSchema<TCommand>; // Optional Zod validation
  decide: (cmd: TCommand, state: TState, ctx: TContext) => TEvent[];
  evolve: (state: TState, event: TEvent) => TState;
  resolveContext: (cmd: TCommand) => Promise<TContext> | TContext;
}

const decider = system.addDecider(config);
decider.dispatch(command);
decider.state.value; // Current state
```

### Process Manager

```typescript
interface ProcessManagerConfig<TEvent, TCommand> {
  name: string;
  filter: (event: TEvent) => boolean;
  react: (event: TEvent) => TCommand[];
}

system.addProcessManager(config, sourceDecider, targetDecider);
```

### Projector

```typescript
interface ProjectorConfig<TReadState, TEvent> {
  name: string;
  initialState: TReadState;
  project: (state: TReadState, event: TEvent) => TReadState;
}

const projection = system.addProjector(config, decider);
const globalProjection = system.addGlobalProjector(config);
```

## License

MIT