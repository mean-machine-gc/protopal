import { ProcessManagerConfig } from 'protopal';
import { CartEvent } from '../deciders/cart';
import { OrderCommand } from '../deciders/order';
import { CatalogCommand } from '../deciders/catalog';
import { EntityId, ProductName, Price } from '../model';

// Process Manager: Cart → Order
// When a cart is checked out, create an order
export const checkoutProcessManager: ProcessManagerConfig<CartEvent, OrderCommand> = {
  name: 'CheckoutProcessManager',

  filter: (event) => event.type === 'CartCheckedOut',

  react: (event): OrderCommand[] => {
    if (event.type !== 'CartCheckedOut') return [];

    // In a real system, we'd fetch product details and customer info
    // For the prototype, we'll use mock data
    const mockItems = event.payload.items.map((item) => ({
      productId: item.productId,
      productName: `Product ${item.productId}` as ProductName,
      quantity: item.quantity,
      unitPrice: item.priceAtAdd,
    }));

    return [
      {
        type: 'CreateOrder',
        payload: {
          orderId: `order-${Date.now()}` as EntityId,
          customerId: 'customer-123' as EntityId, // Mock customer
          items: mockItems,
          shippingAddress: {
            name: 'John Doe',
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94105',
            country: 'USA',
          },
          billingInfo: {
            cardLastFour: '4242',
            cardType: 'Visa',
            billingAddress: {
              name: 'John Doe',
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'USA',
            },
          },
        },
      },
    ];
  },
};