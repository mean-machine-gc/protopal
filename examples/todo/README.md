# Todo Example

A simple todo application demonstrating protopal's core concepts with minimal complexity.

## Features

- **Add todos**: Create new todo items with validation
- **Complete/Reactivate**: Mark todos as done or reactivate them
- **Edit**: Update todo text inline
- **Archive**: Move todos to archived state
- **Stats**: Live completion statistics
- **State Visibility**: See all states (Active, Completed, Archived)
- **Trace Panel**: Watch every command and event

## Running the Example

```bash
cd examples/todo
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## What This Demonstrates

### 1. Discriminated Unions for State Modeling
```typescript
type TodoStatus =
  | { kind: 'Active'; createdAt: Timestamp }
  | { kind: 'Completed'; completedAt: Timestamp }
  | { kind: 'Archived'; archivedAt: Timestamp };
```

Each state has different data - no nullable fields or boolean flags!

### 2. Command Validation with Zod
```typescript
const todoCommandSchema = createCommandSchema([
  {
    type: 'AddTodo',
    payload: z.object({
      text: z.string().min(1).max(500)
    })
  }
]);
```

Runtime validation with helpful error messages.

### 3. Business Rules in `decide()`
```typescript
if (todo.status.kind !== 'Active') {
  return [{ 
    type: 'TodoCommandFailed', 
    payload: { reason: 'Todo is not active' } 
  }];
}
```

All guards and business logic in one place.

### 4. Pure State Evolution in `evolve()`
```typescript
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
```

No guards - just pure state application.

### 5. Derived Signals (No Hooks!)
```typescript
export const activeTodos = select(todo, s =>
  Object.values(s.todos).filter(t => t.status.kind === 'Active')
);

// In components:
<div>Active: {activeTodos.value.length}</div>
```

Automatically re-renders when state changes.

### 6. Form Validation
The app shows both client-side validation (through Zod schemas) and business rule validation (through the decide function). Watch the trace to see validation events!

This is a perfect starting point to understand protopal's core concepts before exploring more complex examples like ecommerce.