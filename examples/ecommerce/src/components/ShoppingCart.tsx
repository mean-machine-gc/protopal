import React from 'react';
import { ecommerce } from '../system';

interface ShoppingCartProps {
  cartId: string;
}

export function ShoppingCart({ cartId }: ShoppingCartProps) {
  const cart = ecommerce.getCart(cartId).value;
  const total = ecommerce.getCartTotal(cartId).value;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Your cart is empty.</p>
        <p className="text-gray-400 mt-2">Add some products from the catalog!</p>
      </div>
    );
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      ecommerce.cart.dispatch({
        type: 'RemoveFromCart',
        payload: { cartId, productId },
      });
    } else {
      ecommerce.cart.dispatch({
        type: 'UpdateCartItemQuantity',
        payload: { cartId, productId, quantity },
      });
    }
  };

  const handleCheckout = () => {
    ecommerce.cart.dispatch({
      type: 'CheckoutCart',
      payload: { cartId },
    });
  };

  const handleClearCart = () => {
    ecommerce.cart.dispatch({
      type: 'ClearCart',
      payload: { cartId },
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h2>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Cart Items ({cart.items.length})</h3>
        </div>

        <div className="divide-y">
          {cart.items.map((item) => (
            <div key={item.productId} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900">
                  Product #{item.productId.slice(-8)}
                </h4>
                <p className="text-gray-600">${item.priceAtAdd} each</p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>

                <div className="w-24 text-right font-semibold">
                  ${(item.priceAtAdd * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => handleUpdateQuantity(item.productId, 0)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xl font-semibold">Total:</span>
            <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleCheckout}
              className="flex-1 bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Checkout
            </button>
            <button
              onClick={handleClearCart}
              className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}