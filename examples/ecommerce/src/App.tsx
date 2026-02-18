import React, { useState } from 'react';
import { ecommerce } from './system';
import { ProductCatalog } from './components/ProductCatalog';
import { ShoppingCart } from './components/ShoppingCart';
import { OrderList } from './components/OrderList';
import { Dashboard } from './components/Dashboard';
import { TracePanel } from './components/TracePanel';
import { SeedData } from './components/SeedData';

type View = 'catalog' | 'cart' | 'orders' | 'dashboard';

export function App() {
  const [view, setView] = useState<View>('catalog');
  const [currentCartId] = useState(`cart-${Date.now()}`);
  
  // Create initial cart
  React.useEffect(() => {
    ecommerce.cart.dispatch({
      type: 'CreateCart',
      payload: { id: currentCartId },
    });
  }, [currentCartId]);

  const cartItemCount = ecommerce.getCart(currentCartId).value?.items.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">🛍️ Protopal Shop</h1>
            <nav className="flex space-x-8">
              <button
                onClick={() => setView('catalog')}
                className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'catalog' ? 'bg-gray-100' : ''
                }`}
              >
                Catalog
              </button>
              <button
                onClick={() => setView('cart')}
                className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium relative ${
                  view === 'cart' ? 'bg-gray-100' : ''
                }`}
              >
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setView('orders')}
                className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'orders' ? 'bg-gray-100' : ''
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'dashboard' ? 'bg-gray-100' : ''
                }`}
              >
                Dashboard
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'catalog' && <ProductCatalog cartId={currentCartId} />}
        {view === 'cart' && <ShoppingCart cartId={currentCartId} />}
        {view === 'orders' && <OrderList />}
        {view === 'dashboard' && <Dashboard />}
      </main>

      {/* Seed Data Button */}
      <SeedData />

      {/* Trace Panel */}
      <TracePanel />
    </div>
  );
}