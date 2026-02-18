import { DeciderConfig } from 'protopal';
import {
  EntityId,
  Cart,
  CartItem,
  Price,
  Quantity,
  Timestamp,
  ProductName,
} from '../model';

// Commands
export type CartCommand =
  | {
      type: 'CreateCart';
      payload: {
        id: EntityId;
        customerId?: EntityId;
      };
    }
  | {
      type: 'AddToCart';
      payload: {
        cartId: EntityId;
        productId: EntityId;
        quantity: Quantity;
      };
    }
  | {
      type: 'UpdateCartItemQuantity';
      payload: {
        cartId: EntityId;
        productId: EntityId;
        quantity: Quantity;
      };
    }
  | {
      type: 'RemoveFromCart';
      payload: {
        cartId: EntityId;
        productId: EntityId;
      };
    }
  | {
      type: 'ClearCart';
      payload: {
        cartId: EntityId;
      };
    }
  | {
      type: 'CheckoutCart';
      payload: {
        cartId: EntityId;
      };
    };

// Events
export type CartEvent =
  | {
      type: 'CartCreated';
      payload: {
        id: EntityId;
        customerId?: EntityId;
        createdAt: Timestamp;
      };
    }
  | {
      type: 'ItemAddedToCart';
      payload: {
        cartId: EntityId;
        productId: EntityId;
        quantity: Quantity;
        priceAtAdd: Price;
      };
    }
  | {
      type: 'CartItemQuantityUpdated';
      payload: {
        cartId: EntityId;
        productId: EntityId;
        oldQuantity: Quantity;
        newQuantity: Quantity;
      };
    }
  | {
      type: 'ItemRemovedFromCart';
      payload: {
        cartId: EntityId;
        productId: EntityId;
      };
    }
  | {
      type: 'CartCleared';
      payload: {
        cartId: EntityId;
      };
    }
  | {
      type: 'CartCheckedOut';
      payload: {
        cartId: EntityId;
        items: CartItem[];
      };
    }
  | {
      type: 'CartCommandFailed';
      payload: { command: string; reason: string };
    };

// State
export type CartState = {
  carts: Record<EntityId, Cart>;
};

// Context - will include product info for validation
export type CartContext = {
  timestamp: Timestamp;
  productInfo?: {
    id: EntityId;
    name: ProductName;
    price: Price;
    stock: Quantity;
    available: boolean;
  };
};

// Decider
export const cartDecider: DeciderConfig<
  CartCommand,
  CartState,
  CartContext,
  CartEvent
> = {
  name: 'Cart',
  initialState: { carts: {} },

  resolveContext: async (cmd) => {
    const timestamp = new Date().toISOString();
    
    // In a real system, we'd fetch product info here
    // For the prototype, we'll mock it
    if (cmd.type === 'AddToCart') {
      return {
        timestamp,
        productInfo: {
          id: cmd.payload.productId,
          name: 'Sample Product' as ProductName,
          price: 29.99,
          stock: 10,
          available: true,
        },
      };
    }
    
    return { timestamp };
  },

  decide: (cmd, state, ctx) => {
    switch (cmd.type) {
      case 'CreateCart': {
        if (state.carts[cmd.payload.id]) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-already-exists' },
            },
          ];
        }
        return [
          {
            type: 'CartCreated',
            payload: {
              id: cmd.payload.id,
              customerId: cmd.payload.customerId,
              createdAt: ctx.timestamp,
            },
          },
        ];
      }

      case 'AddToCart': {
        const cart = state.carts[cmd.payload.cartId];
        if (!cart) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-not-found' },
            },
          ];
        }

        if (!ctx.productInfo?.available) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'product-not-available' },
            },
          ];
        }

        if (ctx.productInfo.stock < cmd.payload.quantity) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'insufficient-stock' },
            },
          ];
        }

        // Check if item already in cart
        const existingItem = cart.items.find(
          (item) => item.productId === cmd.payload.productId
        );
        
        if (existingItem) {
          const newQuantity = existingItem.quantity + cmd.payload.quantity;
          if (newQuantity > ctx.productInfo.stock) {
            return [
              {
                type: 'CartCommandFailed',
                payload: { command: cmd.type, reason: 'insufficient-stock' },
              },
            ];
          }
          return [
            {
              type: 'CartItemQuantityUpdated',
              payload: {
                cartId: cmd.payload.cartId,
                productId: cmd.payload.productId,
                oldQuantity: existingItem.quantity,
                newQuantity,
              },
            },
          ];
        }

        return [
          {
            type: 'ItemAddedToCart',
            payload: {
              cartId: cmd.payload.cartId,
              productId: cmd.payload.productId,
              quantity: cmd.payload.quantity,
              priceAtAdd: ctx.productInfo.price,
            },
          },
        ];
      }

      case 'UpdateCartItemQuantity': {
        const cart = state.carts[cmd.payload.cartId];
        if (!cart) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-not-found' },
            },
          ];
        }

        const item = cart.items.find(
          (item) => item.productId === cmd.payload.productId
        );
        if (!item) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'item-not-in-cart' },
            },
          ];
        }

        if (cmd.payload.quantity === 0) {
          return [
            {
              type: 'ItemRemovedFromCart',
              payload: {
                cartId: cmd.payload.cartId,
                productId: cmd.payload.productId,
              },
            },
          ];
        }

        return [
          {
            type: 'CartItemQuantityUpdated',
            payload: {
              cartId: cmd.payload.cartId,
              productId: cmd.payload.productId,
              oldQuantity: item.quantity,
              newQuantity: cmd.payload.quantity,
            },
          },
        ];
      }

      case 'RemoveFromCart': {
        const cart = state.carts[cmd.payload.cartId];
        if (!cart) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-not-found' },
            },
          ];
        }

        const item = cart.items.find(
          (item) => item.productId === cmd.payload.productId
        );
        if (!item) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'item-not-in-cart' },
            },
          ];
        }

        return [
          {
            type: 'ItemRemovedFromCart',
            payload: {
              cartId: cmd.payload.cartId,
              productId: cmd.payload.productId,
            },
          },
        ];
      }

      case 'ClearCart': {
        const cart = state.carts[cmd.payload.cartId];
        if (!cart) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-not-found' },
            },
          ];
        }

        if (cart.items.length === 0) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-already-empty' },
            },
          ];
        }

        return [
          {
            type: 'CartCleared',
            payload: { cartId: cmd.payload.cartId },
          },
        ];
      }

      case 'CheckoutCart': {
        const cart = state.carts[cmd.payload.cartId];
        if (!cart) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-not-found' },
            },
          ];
        }

        if (cart.items.length === 0) {
          return [
            {
              type: 'CartCommandFailed',
              payload: { command: cmd.type, reason: 'cart-empty' },
            },
          ];
        }

        return [
          {
            type: 'CartCheckedOut',
            payload: {
              cartId: cmd.payload.cartId,
              items: cart.items,
            },
          },
        ];
      }

      default:
        return [];
    }
  },

  evolve: (state, event) => {
    switch (event.type) {
      case 'CartCreated':
        return {
          carts: {
            ...state.carts,
            [event.payload.id]: {
              id: event.payload.id,
              customerId: event.payload.customerId,
              items: [],
              createdAt: event.payload.createdAt,
            },
          },
        };

      case 'ItemAddedToCart':
        return {
          carts: {
            ...state.carts,
            [event.payload.cartId]: {
              ...state.carts[event.payload.cartId],
              items: [
                ...state.carts[event.payload.cartId].items,
                {
                  productId: event.payload.productId,
                  quantity: event.payload.quantity,
                  priceAtAdd: event.payload.priceAtAdd,
                },
              ],
            },
          },
        };

      case 'CartItemQuantityUpdated':
        return {
          carts: {
            ...state.carts,
            [event.payload.cartId]: {
              ...state.carts[event.payload.cartId],
              items: state.carts[event.payload.cartId].items.map((item) =>
                item.productId === event.payload.productId
                  ? { ...item, quantity: event.payload.newQuantity }
                  : item
              ),
            },
          },
        };

      case 'ItemRemovedFromCart':
        return {
          carts: {
            ...state.carts,
            [event.payload.cartId]: {
              ...state.carts[event.payload.cartId],
              items: state.carts[event.payload.cartId].items.filter(
                (item) => item.productId !== event.payload.productId
              ),
            },
          },
        };

      case 'CartCleared':
        return {
          carts: {
            ...state.carts,
            [event.payload.cartId]: {
              ...state.carts[event.payload.cartId],
              items: [],
            },
          },
        };

      case 'CartCheckedOut':
        // Remove cart after checkout
        const { [event.payload.cartId]: _, ...remainingCarts } = state.carts;
        return { carts: remainingCarts };

      case 'CartCommandFailed':
        return state;

      default:
        return state;
    }
  },
};