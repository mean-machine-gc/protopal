import { ProjectorConfig } from 'protopal';
import { EntityId, Price } from '../model';

// Dashboard state for analytics
export type DashboardState = {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalRevenue: Price;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: number;
  }>;
};

// Global projector that listens to all events
export const dashboardProjector: ProjectorConfig<
  DashboardState,
  { decider: string; event: any }
> = {
  name: 'Dashboard',
  initialState: {
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    ordersByStatus: {},
    totalRevenue: 0,
    recentActivity: [],
  },

  project: (state, { decider, event }) => {
    // Add to recent activity
    const activity = {
      type: event.type,
      description: getEventDescription(decider, event),
      timestamp: Date.now(),
    };
    
    const recentActivity = [activity, ...state.recentActivity].slice(0, 20);

    switch (event.type) {
      // Catalog events
      case 'ProductAdded':
        return {
          ...state,
          totalProducts: state.totalProducts + 1,
          activeProducts: event.payload.stock > 0 ? state.activeProducts + 1 : state.activeProducts,
          recentActivity,
        };

      case 'ProductOutOfStock':
        return {
          ...state,
          activeProducts: state.activeProducts - 1,
          recentActivity,
        };

      case 'ProductBackInStock':
        return {
          ...state,
          activeProducts: state.activeProducts + 1,
          recentActivity,
        };

      case 'ProductDiscontinued':
        return {
          ...state,
          activeProducts: state.activeProducts - 1,
          recentActivity,
        };

      // Order events
      case 'OrderCreated':
        return {
          ...state,
          totalOrders: state.totalOrders + 1,
          ordersByStatus: {
            ...state.ordersByStatus,
            Pending: (state.ordersByStatus['Pending'] || 0) + 1,
          },
          recentActivity,
        };

      case 'PaymentConfirmed':
        return {
          ...state,
          ordersByStatus: {
            ...state.ordersByStatus,
            Pending: (state.ordersByStatus['Pending'] || 0) - 1,
            Confirmed: (state.ordersByStatus['Confirmed'] || 0) + 1,
          },
          totalRevenue: state.totalRevenue + getOrderTotal(event),
          recentActivity,
        };

      case 'OrderShipped':
        return {
          ...state,
          ordersByStatus: {
            ...state.ordersByStatus,
            Confirmed: (state.ordersByStatus['Confirmed'] || 0) - 1,
            Shipped: (state.ordersByStatus['Shipped'] || 0) + 1,
          },
          recentActivity,
        };

      case 'OrderDelivered':
        return {
          ...state,
          ordersByStatus: {
            ...state.ordersByStatus,
            Shipped: (state.ordersByStatus['Shipped'] || 0) - 1,
            Delivered: (state.ordersByStatus['Delivered'] || 0) + 1,
          },
          recentActivity,
        };

      case 'OrderCancelled':
        return {
          ...state,
          ordersByStatus: {
            ...state.ordersByStatus,
            Pending: (state.ordersByStatus['Pending'] || 0) - 1,
            Cancelled: (state.ordersByStatus['Cancelled'] || 0) + 1,
          },
          recentActivity,
        };

      default:
        return { ...state, recentActivity };
    }
  },
};

// Helper functions
function getEventDescription(decider: string, event: any): string {
  switch (event.type) {
    case 'ProductAdded':
      return `New product added: ${event.payload.name}`;
    case 'OrderCreated':
      return `Order #${event.payload.orderId.slice(-8)} created`;
    case 'PaymentConfirmed':
      return `Payment confirmed for order #${event.payload.orderId.slice(-8)}`;
    case 'ItemAddedToCart':
      return `Item added to cart`;
    case 'CartCheckedOut':
      return `Cart checked out with ${event.payload.items.length} items`;
    default:
      return `${decider}: ${event.type}`;
  }
}

function getOrderTotal(event: any): Price {
  // For payment confirmed events, we'd need to look up the order
  // For the prototype, return a mock value
  return 99.99;
}