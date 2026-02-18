import { ProcessManagerConfig } from 'protopal';
import { OrderEvent } from '../deciders/order';
import { CatalogCommand } from '../deciders/catalog';

// Process Manager: Order → Catalog
// Update inventory when orders are confirmed or cancelled
export const inventoryProcessManager: ProcessManagerConfig<OrderEvent, CatalogCommand> = {
  name: 'InventoryProcessManager',

  filter: (event) =>
    ['OrderCreated', 'OrderCancelled', 'OrderRefunded'].includes(event.type),

  react: (event): CatalogCommand[] => {
    switch (event.type) {
      case 'OrderCreated':
        // Reserve inventory by reducing stock
        return event.payload.items.map((item) => ({
          type: 'AdjustStock',
          payload: {
            id: item.productId,
            adjustment: -item.quantity,
            reason: `Order ${event.payload.orderId}`,
          },
        }));

      case 'OrderCancelled':
      case 'OrderRefunded':
        // Return inventory by increasing stock
        // In a real system, we'd need to track which items to restore
        // For the prototype, we'll skip this
        return [];

      default:
        return [];
    }
  },
};