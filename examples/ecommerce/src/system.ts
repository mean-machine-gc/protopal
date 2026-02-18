/**
 * Ecommerce System Wiring
 * =======================
 * 
 * Wire all deciders, process managers, and projectors together
 */

import { System, select } from 'protopal';
import { computed } from '@preact/signals-react';

// Import deciders
import { catalogDecider } from './deciders/catalog';
import { cartDecider } from './deciders/cart';
import { orderDecider } from './deciders/order';

// Import process managers
import { checkoutProcessManager } from './process-managers/checkout';
import { inventoryProcessManager } from './process-managers/inventory';

// Import projectors
import { dashboardProjector } from './projectors/dashboard';

export function createEcommerceSystem() {
  const system = new System(true); // Enable console tracing

  // Add deciders
  const catalog = system.addDecider(catalogDecider);
  const cart = system.addDecider(cartDecider);
  const order = system.addDecider(orderDecider);

  // Add process managers
  system.addProcessManager(checkoutProcessManager, cart, order);
  system.addProcessManager(inventoryProcessManager, order, catalog);

  // Add projectors
  const dashboard = system.addGlobalProjector(dashboardProjector);

  // Derived signals for UI
  const availableProducts = select(catalog, (state) =>
    Object.values(state.products).filter(
      (p) => p.status.kind === 'Active' && p.stock > 0
    )
  );

  const allProducts = select(catalog, (state) =>
    Object.values(state.products)
  );

  const productsByCategory = select(catalog, (state) => {
    const products = Object.values(state.products);
    return products.reduce((acc, product) => {
      const category = product.category.kind;
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
    }, {} as Record<string, typeof products>);
  });

  const activeCarts = select(cart, (state) =>
    Object.values(state.carts)
  );

  const cartCount = select(cart, (state) =>
    Object.keys(state.carts).length
  );

  const pendingOrders = select(order, (state) =>
    Object.values(state.orders).filter((o) => o.status.kind === 'Pending')
  );

  const recentOrders = select(order, (state) =>
    Object.values(state.orders)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  );

  // Cart helper - get cart by ID
  const getCart = (cartId: string) =>
    computed(() => cart.state.value.carts[cartId]);

  // Cart total calculator
  const getCartTotal = (cartId: string) =>
    computed(() => {
      const cartData = cart.state.value.carts[cartId];
      if (!cartData) return 0;
      
      return cartData.items.reduce(
        (sum, item) => sum + item.priceAtAdd * item.quantity,
        0
      );
    });

  return {
    system,
    // Deciders
    catalog,
    cart,
    order,
    // Projectors
    dashboard,
    // Derived signals
    availableProducts,
    allProducts,
    productsByCategory,
    activeCarts,
    cartCount,
    pendingOrders,
    recentOrders,
    // Helper functions
    getCart,
    getCartTotal,
  };
}

// Create and export the singleton instance
export const ecommerce = createEcommerceSystem();