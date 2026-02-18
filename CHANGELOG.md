# Changelog

All notable changes to Protopal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-02-18

### Added

- Initial release of Protopal event sourcing runtime
- Core event sourcing primitives (System, Decider, Projector, ProcessManager)
- Signals-based state management with @preact/signals-react integration
- Command validation with Zod schemas
- Local storage persistence adapter
- Built-in tracing and debugging support
- Three complete examples: counter, todo, ecommerce
- CLI tool (`create-protopal-app`) for scaffolding new projects
- Comprehensive documentation and guides

### Features

- **Event Sourcing**: Complete command → decide → event → evolve flow
- **Signals Integration**: Automatic React re-rendering without hooks
- **Type Safety**: Full TypeScript support with discriminated unions
- **Validation**: Optional Zod schemas for runtime validation
- **Process Managers**: Cross-aggregate workflow coordination
- **Projectors**: Denormalized read models from event streams
- **Persistence**: Pluggable persistence with localStorage adapter
- **Tracing**: Real-time command and event visibility
- **Zero Hooks**: Components read signals directly, no React state hooks needed

### Examples

- **Counter**: Basic concepts with validation
- **Todo**: CRUD operations with state transitions
- **Ecommerce**: Complex domain with process managers and projections