import { DeciderConfig } from 'protopal';
import {
  EntityId,
  Order,
  OrderItem,
  OrderStatus,
  OrderTotals,
  ShippingAddress,
  BillingInfo,
  Price,
  Timestamp,
  CartItem,
  ProductName,
} from '../model';

// Commands
export type OrderCommand =
  | {
      type: 'CreateOrder';
      payload: {
        orderId: EntityId;
        customerId: EntityId;
        items: Array<{
          productId: EntityId;
          productName: ProductName;
          quantity: number;
          unitPrice: Price;
        }>;
        shippingAddress: ShippingAddress;
        billingInfo: BillingInfo;
      };
    }
  | {
      type: 'ProcessPayment';
      payload: {
        orderId: EntityId;
        paymentId: EntityId;
      };
    }
  | {
      type: 'ConfirmPayment';
      payload: {
        orderId: EntityId;
        paymentId: EntityId;
      };
    }
  | {
      type: 'FailPayment';
      payload: {
        orderId: EntityId;
        reason: string;
      };
    }
  | {
      type: 'ShipOrder';
      payload: {
        orderId: EntityId;
        trackingNumber: string;
      };
    }
  | {
      type: 'DeliverOrder';
      payload: {
        orderId: EntityId;
      };
    }
  | {
      type: 'CancelOrder';
      payload: {
        orderId: EntityId;
        reason: string;
      };
    }
  | {
      type: 'RefundOrder';
      payload: {
        orderId: EntityId;
        amount: Price;
      };
    };

// Events
export type OrderEvent =
  | {
      type: 'OrderCreated';
      payload: {
        orderId: EntityId;
        customerId: EntityId;
        items: OrderItem[];
        shippingAddress: ShippingAddress;
        billingInfo: BillingInfo;
        totals: OrderTotals;
        createdAt: Timestamp;
      };
    }
  | {
      type: 'PaymentProcessingStarted';
      payload: {
        orderId: EntityId;
        paymentId: EntityId;
      };
    }
  | {
      type: 'PaymentConfirmed';
      payload: {
        orderId: EntityId;
        paymentId: EntityId;
        confirmedAt: Timestamp;
      };
    }
  | {
      type: 'PaymentFailed';
      payload: {
        orderId: EntityId;
        reason: string;
      };
    }
  | {
      type: 'OrderShipped';
      payload: {
        orderId: EntityId;
        trackingNumber: string;
        shippedAt: Timestamp;
      };
    }
  | {
      type: 'OrderDelivered';
      payload: {
        orderId: EntityId;
        deliveredAt: Timestamp;
      };
    }
  | {
      type: 'OrderCancelled';
      payload: {
        orderId: EntityId;
        reason: string;
        cancelledAt: Timestamp;
      };
    }
  | {
      type: 'OrderRefunded';
      payload: {
        orderId: EntityId;
        amount: Price;
        refundedAt: Timestamp;
      };
    }
  | {
      type: 'OrderCommandFailed';
      payload: { command: string; reason: string };
    };

// State
export type OrderState = {
  orders: Record<EntityId, Order>;
};

// Context
export type OrderContext = {
  timestamp: Timestamp;
  paymentSuccess?: boolean;
};

// Helper to calculate totals
const calculateTotals = (items: OrderItem[]): OrderTotals => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.08; // 8% tax
  const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
  const total = subtotal + tax + shipping;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

// Decider
export const orderDecider: DeciderConfig<
  OrderCommand,
  OrderState,
  OrderContext,
  OrderEvent
> = {
  name: 'Order',
  initialState: { orders: {} },

  resolveContext: async (cmd) => {
    const timestamp = new Date().toISOString();
    
    // Mock payment processing
    if (cmd.type === 'ConfirmPayment') {
      return {
        timestamp,
        paymentSuccess: Math.random() > 0.1, // 90% success rate
      };
    }
    
    return { timestamp };
  },

  decide: (cmd, state, ctx) => {
    switch (cmd.type) {
      case 'CreateOrder': {
        if (state.orders[cmd.payload.orderId]) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-already-exists' },
            },
          ];
        }

        const items: OrderItem[] = cmd.payload.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        }));

        const totals = calculateTotals(items);

        return [
          {
            type: 'OrderCreated',
            payload: {
              orderId: cmd.payload.orderId,
              customerId: cmd.payload.customerId,
              items,
              shippingAddress: cmd.payload.shippingAddress,
              billingInfo: cmd.payload.billingInfo,
              totals,
              createdAt: ctx.timestamp,
            },
          },
        ];
      }

      case 'ProcessPayment': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        if (order.status.kind !== 'Pending') {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'invalid-order-status' },
            },
          ];
        }

        return [
          {
            type: 'PaymentProcessingStarted',
            payload: {
              orderId: cmd.payload.orderId,
              paymentId: cmd.payload.paymentId,
            },
          },
        ];
      }

      case 'ConfirmPayment': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        if (order.status.kind !== 'PaymentProcessing') {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'not-processing-payment' },
            },
          ];
        }

        if (ctx.paymentSuccess) {
          return [
            {
              type: 'PaymentConfirmed',
              payload: {
                orderId: cmd.payload.orderId,
                paymentId: cmd.payload.paymentId,
                confirmedAt: ctx.timestamp,
              },
            },
          ];
        } else {
          return [
            {
              type: 'PaymentFailed',
              payload: {
                orderId: cmd.payload.orderId,
                reason: 'Payment declined',
              },
            },
          ];
        }
      }

      case 'FailPayment': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        if (order.status.kind !== 'PaymentProcessing') {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'not-processing-payment' },
            },
          ];
        }

        return [
          {
            type: 'PaymentFailed',
            payload: {
              orderId: cmd.payload.orderId,
              reason: cmd.payload.reason,
            },
          },
        ];
      }

      case 'ShipOrder': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        if (order.status.kind !== 'Confirmed') {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-confirmed' },
            },
          ];
        }

        return [
          {
            type: 'OrderShipped',
            payload: {
              orderId: cmd.payload.orderId,
              trackingNumber: cmd.payload.trackingNumber,
              shippedAt: ctx.timestamp,
            },
          },
        ];
      }

      case 'DeliverOrder': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        if (order.status.kind !== 'Shipped') {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-shipped' },
            },
          ];
        }

        return [
          {
            type: 'OrderDelivered',
            payload: {
              orderId: cmd.payload.orderId,
              deliveredAt: ctx.timestamp,
            },
          },
        ];
      }

      case 'CancelOrder': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        // Can only cancel pending or payment failed orders
        if (order.status.kind !== 'Pending' && order.status.kind !== 'PaymentFailed') {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'cannot-cancel-order' },
            },
          ];
        }

        return [
          {
            type: 'OrderCancelled',
            payload: {
              orderId: cmd.payload.orderId,
              reason: cmd.payload.reason,
              cancelledAt: ctx.timestamp,
            },
          },
        ];
      }

      case 'RefundOrder': {
        const order = state.orders[cmd.payload.orderId];
        if (!order) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'order-not-found' },
            },
          ];
        }

        // Can refund confirmed, shipped, or delivered orders
        const refundableStatuses: OrderStatus['kind'][] = ['Confirmed', 'Shipped', 'Delivered'];
        if (!refundableStatuses.includes(order.status.kind)) {
          return [
            {
              type: 'OrderCommandFailed',
              payload: { command: cmd.type, reason: 'cannot-refund-order' },
            },
          ];
        }

        return [
          {
            type: 'OrderRefunded',
            payload: {
              orderId: cmd.payload.orderId,
              amount: cmd.payload.amount,
              refundedAt: ctx.timestamp,
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
      case 'OrderCreated':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              id: event.payload.orderId,
              customerId: event.payload.customerId,
              items: event.payload.items,
              shippingAddress: event.payload.shippingAddress,
              billing: event.payload.billingInfo,
              status: { kind: 'Pending' },
              totals: event.payload.totals,
              createdAt: event.payload.createdAt,
              updatedAt: event.payload.createdAt,
            },
          },
        };

      case 'PaymentProcessingStarted':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: { kind: 'PaymentProcessing' },
              updatedAt: new Date().toISOString(),
            },
          },
        };

      case 'PaymentConfirmed':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: { kind: 'Confirmed', confirmedAt: event.payload.confirmedAt },
              updatedAt: event.payload.confirmedAt,
            },
          },
        };

      case 'PaymentFailed':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: { kind: 'PaymentFailed', reason: event.payload.reason },
              updatedAt: new Date().toISOString(),
            },
          },
        };

      case 'OrderShipped':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: {
                kind: 'Shipped',
                shippedAt: event.payload.shippedAt,
                trackingNumber: event.payload.trackingNumber,
              },
              updatedAt: event.payload.shippedAt,
            },
          },
        };

      case 'OrderDelivered':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: { kind: 'Delivered', deliveredAt: event.payload.deliveredAt },
              updatedAt: event.payload.deliveredAt,
            },
          },
        };

      case 'OrderCancelled':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: {
                kind: 'Cancelled',
                cancelledAt: event.payload.cancelledAt,
                reason: event.payload.reason,
              },
              updatedAt: event.payload.cancelledAt,
            },
          },
        };

      case 'OrderRefunded':
        return {
          orders: {
            ...state.orders,
            [event.payload.orderId]: {
              ...state.orders[event.payload.orderId],
              status: {
                kind: 'Refunded',
                refundedAt: event.payload.refundedAt,
                amount: event.payload.amount,
              },
              updatedAt: event.payload.refundedAt,
            },
          },
        };

      case 'OrderCommandFailed':
        return state;

      default:
        return state;
    }
  },
};