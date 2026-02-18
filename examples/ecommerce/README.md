# Ecommerce Example

A complete ecommerce application demonstrating protopal's event sourcing capabilities.

## Features

- **Product Catalog**: Browse and manage products
- **Shopping Cart**: Add/remove items, calculate totals
- **Order Management**: Complete checkout flow with order tracking
- **Process Managers**: Coordinate workflows across aggregates
- **Dashboard**: Real-time stats and metrics
- **Trace Panel**: See every command and event

## Running the Example

```bash
cd examples/ecommerce
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Architecture

This example demonstrates:

- **Three deciders**: Catalog, Cart, Order
- **Cross-aggregate workflows**: Cart → Order coordination via process managers
- **Real-time projections**: Dashboard showing live statistics
- **Event tracing**: Every interaction visible in the trace panel

The trace panel shows how user interactions flow through the system:
1. User adds product to cart → `AddToCart` command
2. Cart processes command → `ItemAddedToCart` event
3. Dashboard projector updates stats automatically
4. Components re-render automatically via signals

## Key Files

- `src/model.ts` - Domain types and discriminated unions
- `src/deciders/` - Business logic for catalog, cart, and orders
- `src/process-managers/` - Cross-aggregate coordination
- `src/projectors/dashboard.ts` - Real-time dashboard projections
- `src/system.ts` - Wire everything together
- `src/components/` - React UI components (no hooks for domain state!)