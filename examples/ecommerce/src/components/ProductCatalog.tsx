import React from 'react';
import { ecommerce } from '../system';
import { Product } from '../model';

interface ProductCatalogProps {
  cartId: string;
}

export function ProductCatalog({ cartId }: ProductCatalogProps) {
  const products = ecommerce.availableProducts.value;
  const allProducts = ecommerce.allProducts.value;

  const handleAddToCart = (product: Product) => {
    ecommerce.cart.dispatch({
      type: 'AddToCart',
      payload: {
        cartId,
        productId: product.id,
        quantity: 1,
      },
    });
  };

  if (allProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products available.</p>
        <p className="text-gray-400 mt-2">Click "Seed Data" at the bottom to add sample products.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Catalog</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            {product.imageUrl && (
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-6xl">{getProductEmoji(product.category.kind)}</span>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{product.description}</p>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                <span className={`text-sm px-2 py-1 rounded ${getStatusStyle(product.status.kind)}`}>
                  {product.status.kind === 'OutOfStock' ? 'Out of Stock' : product.status.kind}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.status.kind !== 'Active' || product.stock === 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    product.status.kind === 'Active' && product.stock > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.status.kind === 'Active' && product.stock > 0
                    ? 'Add to Cart'
                    : product.status.kind === 'Discontinued'
                    ? 'Discontinued'
                    : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getProductEmoji(category: string): string {
  const emojis: Record<string, string> = {
    Electronics: '📱',
    Clothing: '👕',
    Books: '📚',
    Home: '🏠',
    Sports: '⚽',
    Other: '📦',
  };
  return emojis[category] || '📦';
}

function getStatusStyle(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'OutOfStock':
      return 'bg-red-100 text-red-800';
    case 'Discontinued':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}