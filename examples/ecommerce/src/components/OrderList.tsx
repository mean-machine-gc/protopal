import React from 'react';
import { ecommerce } from '../system';
import { Order } from '../model';

export function OrderList() {
  const orders = ecommerce.recentOrders.value;

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No orders yet.</p>
        <p className="text-gray-400 mt-2">Complete a checkout to see your orders here!</p>
      </div>
    );
  }

  const handleProcessPayment = (orderId: string) => {
    ecommerce.order.dispatch({
      type: 'ProcessPayment',
      payload: { orderId, paymentId: `payment-${Date.now()}` },
    });

    // Simulate payment confirmation after a delay
    setTimeout(() => {
      ecommerce.order.dispatch({
        type: 'ConfirmPayment',
        payload: { orderId, paymentId: `payment-${Date.now()}` },
      });
    }, 2000);
  };

  const handleShipOrder = (orderId: string) => {
    ecommerce.order.dispatch({
      type: 'ShipOrder',
      payload: { orderId, trackingNumber: `TRACK-${Date.now()}` },
    });
  };

  const handleDeliverOrder = (orderId: string) => {
    ecommerce.order.dispatch({
      type: 'DeliverOrder',
      payload: { orderId },
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders</h2>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">Order #{order.id.slice(-8)}</h3>
                <p className="text-gray-600 text-sm">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getOrderStatusStyle(order.status.kind)}`}>
                {getOrderStatusText(order.status)}
              </span>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Items:</h4>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.productName} x {item.quantity}
                    </span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${order.totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${order.totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping:</span>
                <span>${order.totals.shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${order.totals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              {order.status.kind === 'Pending' && (
                <button
                  onClick={() => handleProcessPayment(order.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Process Payment
                </button>
              )}
              {order.status.kind === 'Confirmed' && (
                <button
                  onClick={() => handleShipOrder(order.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
                >
                  Ship Order
                </button>
              )}
              {order.status.kind === 'Shipped' && (
                <button
                  onClick={() => handleDeliverOrder(order.id)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700"
                >
                  Mark Delivered
                </button>
              )}
            </div>

            {order.status.kind === 'Shipped' && (
              <p className="text-sm text-gray-600 mt-2">
                Tracking: {order.status.trackingNumber}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getOrderStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    PaymentProcessing: 'bg-blue-100 text-blue-800',
    PaymentFailed: 'bg-red-100 text-red-800',
    Confirmed: 'bg-green-100 text-green-800',
    Shipped: 'bg-purple-100 text-purple-800',
    Delivered: 'bg-gray-100 text-gray-800',
    Cancelled: 'bg-red-100 text-red-800',
    Refunded: 'bg-orange-100 text-orange-800',
  };
  return styles[status] || 'bg-gray-100 text-gray-800';
}

function getOrderStatusText(status: Order['status']): string {
  switch (status.kind) {
    case 'Pending':
      return 'Pending Payment';
    case 'PaymentProcessing':
      return 'Processing Payment';
    case 'PaymentFailed':
      return `Payment Failed: ${status.reason}`;
    case 'Confirmed':
      return 'Payment Confirmed';
    case 'Shipped':
      return 'Shipped';
    case 'Delivered':
      return 'Delivered';
    case 'Cancelled':
      return 'Cancelled';
    case 'Refunded':
      return `Refunded: $${status.amount}`;
    default:
      return status.kind;
  }
}