import React from 'react';
import { ecommerce } from '../system';
import { EntityId, ProductCategory } from '../model';

export function SeedData() {
  const handleSeedData = () => {
    const products = [
      {
        id: 'prod-1' as EntityId,
        name: 'Smartphone Pro Max',
        description: 'Latest flagship smartphone with amazing camera',
        price: 999.99,
        stock: 15,
        category: { kind: 'Electronics' as const },
        imageUrl: '📱',
      },
      {
        id: 'prod-2' as EntityId,
        name: 'Laptop Ultra',
        description: 'High-performance laptop for professionals',
        price: 1499.99,
        stock: 8,
        category: { kind: 'Electronics' as const },
        imageUrl: '💻',
      },
      {
        id: 'prod-3' as EntityId,
        name: 'Classic T-Shirt',
        description: 'Comfortable cotton t-shirt in various colors',
        price: 19.99,
        stock: 100,
        category: { kind: 'Clothing' as const },
        imageUrl: '👕',
      },
      {
        id: 'prod-4' as EntityId,
        name: 'Running Shoes',
        description: 'Professional running shoes with extra comfort',
        price: 89.99,
        stock: 25,
        category: { kind: 'Sports' as const },
        imageUrl: '👟',
      },
      {
        id: 'prod-5' as EntityId,
        name: 'Programming Book',
        description: 'Learn advanced programming techniques',
        price: 49.99,
        stock: 30,
        category: { kind: 'Books' as const },
        imageUrl: '📚',
      },
      {
        id: 'prod-6' as EntityId,
        name: 'Coffee Maker',
        description: 'Premium coffee maker for home use',
        price: 129.99,
        stock: 12,
        category: { kind: 'Home' as const },
        imageUrl: '☕',
      },
      {
        id: 'prod-7' as EntityId,
        name: 'Yoga Mat',
        description: 'Non-slip yoga mat for all levels',
        price: 29.99,
        stock: 0, // Out of stock
        category: { kind: 'Sports' as const },
        imageUrl: '🧘',
      },
      {
        id: 'prod-8' as EntityId,
        name: 'Vintage Watch',
        description: 'Classic timepiece with leather band',
        price: 299.99,
        stock: 5,
        category: { kind: 'Other', name: 'Accessories' },
        imageUrl: '⌚',
      },
    ];

    // Add all products
    products.forEach((product) => {
      ecommerce.catalog.dispatch({
        type: 'AddProduct',
        payload: product,
      });
    });

    // Discontinue one product for demo
    setTimeout(() => {
      ecommerce.catalog.dispatch({
        type: 'DiscontinueProduct',
        payload: { id: 'prod-8' },
      });
    }, 1000);
  };

  return (
    <div className="fixed bottom-20 right-4">
      <button
        onClick={handleSeedData}
        className="bg-green-600 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-700 transition-colors"
      >
        Seed Sample Data
      </button>
    </div>
  );
}