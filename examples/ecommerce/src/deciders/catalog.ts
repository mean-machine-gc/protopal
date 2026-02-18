import { DeciderConfig } from 'protopal';
import {
  EntityId,
  Product,
  ProductName,
  ProductDescription,
  Price,
  Quantity,
  ProductCategory,
  ProductStatus,
  Timestamp,
} from '../model';

// Commands
export type CatalogCommand =
  | {
      type: 'AddProduct';
      payload: {
        id: EntityId;
        name: ProductName;
        description: ProductDescription;
        price: Price;
        stock: Quantity;
        imageUrl?: string;
        category: ProductCategory;
      };
    }
  | {
      type: 'UpdateProductPrice';
      payload: { id: EntityId; price: Price };
    }
  | {
      type: 'UpdateProductStock';
      payload: { id: EntityId; stock: Quantity };
    }
  | {
      type: 'AdjustStock';
      payload: { id: EntityId; adjustment: number; reason: string };
    }
  | {
      type: 'DiscontinueProduct';
      payload: { id: EntityId };
    }
  | {
      type: 'ReactivateProduct';
      payload: { id: EntityId };
    };

// Events
export type CatalogEvent =
  | {
      type: 'ProductAdded';
      payload: {
        id: EntityId;
        name: ProductName;
        description: ProductDescription;
        price: Price;
        stock: Quantity;
        imageUrl?: string;
        category: ProductCategory;
      };
    }
  | {
      type: 'ProductPriceUpdated';
      payload: { id: EntityId; oldPrice: Price; newPrice: Price };
    }
  | {
      type: 'ProductStockUpdated';
      payload: { id: EntityId; oldStock: Quantity; newStock: Quantity };
    }
  | {
      type: 'ProductOutOfStock';
      payload: { id: EntityId };
    }
  | {
      type: 'ProductBackInStock';
      payload: { id: EntityId; stock: Quantity };
    }
  | {
      type: 'ProductDiscontinued';
      payload: { id: EntityId };
    }
  | {
      type: 'ProductReactivated';
      payload: { id: EntityId };
    }
  | {
      type: 'CatalogCommandFailed';
      payload: { command: string; reason: string };
    };

// State
export type CatalogState = {
  products: Record<EntityId, Product>;
};

// Context
export type CatalogContext = {
  timestamp: Timestamp;
};

// Decider
export const catalogDecider: DeciderConfig<
  CatalogCommand,
  CatalogState,
  CatalogContext,
  CatalogEvent
> = {
  name: 'Catalog',
  initialState: { products: {} },

  resolveContext: async () => ({
    timestamp: new Date().toISOString(),
  }),

  decide: (cmd, state, ctx) => {
    switch (cmd.type) {
      case 'AddProduct': {
        if (state.products[cmd.payload.id]) {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-already-exists' },
            },
          ];
        }
        return [{ type: 'ProductAdded', payload: cmd.payload }];
      }

      case 'UpdateProductPrice': {
        const product = state.products[cmd.payload.id];
        if (!product) {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-not-found' },
            },
          ];
        }
        if (product.status.kind === 'Discontinued') {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-discontinued' },
            },
          ];
        }
        return [
          {
            type: 'ProductPriceUpdated',
            payload: {
              id: cmd.payload.id,
              oldPrice: product.price,
              newPrice: cmd.payload.price,
            },
          },
        ];
      }

      case 'UpdateProductStock': {
        const product = state.products[cmd.payload.id];
        if (!product) {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-not-found' },
            },
          ];
        }
        const events: CatalogEvent[] = [
          {
            type: 'ProductStockUpdated',
            payload: {
              id: cmd.payload.id,
              oldStock: product.stock,
              newStock: cmd.payload.stock,
            },
          },
        ];

        // Check stock status changes
        if (product.stock === 0 && cmd.payload.stock > 0) {
          events.push({
            type: 'ProductBackInStock',
            payload: { id: cmd.payload.id, stock: cmd.payload.stock },
          });
        } else if (product.stock > 0 && cmd.payload.stock === 0) {
          events.push({
            type: 'ProductOutOfStock',
            payload: { id: cmd.payload.id },
          });
        }

        return events;
      }

      case 'AdjustStock': {
        const product = state.products[cmd.payload.id];
        if (!product) {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-not-found' },
            },
          ];
        }
        const newStock = Math.max(0, product.stock + cmd.payload.adjustment);
        const events: CatalogEvent[] = [
          {
            type: 'ProductStockUpdated',
            payload: {
              id: cmd.payload.id,
              oldStock: product.stock,
              newStock,
            },
          },
        ];

        if (product.stock === 0 && newStock > 0) {
          events.push({
            type: 'ProductBackInStock',
            payload: { id: cmd.payload.id, stock: newStock },
          });
        } else if (product.stock > 0 && newStock === 0) {
          events.push({
            type: 'ProductOutOfStock',
            payload: { id: cmd.payload.id },
          });
        }

        return events;
      }

      case 'DiscontinueProduct': {
        const product = state.products[cmd.payload.id];
        if (!product) {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-not-found' },
            },
          ];
        }
        if (product.status.kind === 'Discontinued') {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'already-discontinued' },
            },
          ];
        }
        return [{ type: 'ProductDiscontinued', payload: { id: cmd.payload.id } }];
      }

      case 'ReactivateProduct': {
        const product = state.products[cmd.payload.id];
        if (!product) {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'product-not-found' },
            },
          ];
        }
        if (product.status.kind !== 'Discontinued') {
          return [
            {
              type: 'CatalogCommandFailed',
              payload: { command: cmd.type, reason: 'not-discontinued' },
            },
          ];
        }
        return [{ type: 'ProductReactivated', payload: { id: cmd.payload.id } }];
      }

      default:
        return [];
    }
  },

  evolve: (state, event) => {
    switch (event.type) {
      case 'ProductAdded':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...event.payload,
              status: event.payload.stock > 0 
                ? { kind: 'Active' as const }
                : { kind: 'OutOfStock' as const },
            },
          },
        };

      case 'ProductPriceUpdated':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...state.products[event.payload.id],
              price: event.payload.newPrice,
            },
          },
        };

      case 'ProductStockUpdated':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...state.products[event.payload.id],
              stock: event.payload.newStock,
              status:
                event.payload.newStock === 0
                  ? { kind: 'OutOfStock' as const }
                  : state.products[event.payload.id].status.kind === 'OutOfStock'
                  ? { kind: 'Active' as const }
                  : state.products[event.payload.id].status,
            },
          },
        };

      case 'ProductOutOfStock':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...state.products[event.payload.id],
              status: { kind: 'OutOfStock' as const },
            },
          },
        };

      case 'ProductBackInStock':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...state.products[event.payload.id],
              status: { kind: 'Active' as const },
            },
          },
        };

      case 'ProductDiscontinued':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...state.products[event.payload.id],
              status: { kind: 'Discontinued' as const },
            },
          },
        };

      case 'ProductReactivated':
        return {
          products: {
            ...state.products,
            [event.payload.id]: {
              ...state.products[event.payload.id],
              status: state.products[event.payload.id].stock > 0
                ? { kind: 'Active' as const }
                : { kind: 'OutOfStock' as const },
            },
          },
        };

      case 'CatalogCommandFailed':
        return state;

      default:
        return state;
    }
  },
};