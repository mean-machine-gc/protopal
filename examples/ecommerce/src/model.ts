/**
 * Ecommerce Domain Model
 * ======================
 * 
 * Core types for our ecommerce prototype
 */

/** @format uuid */
export type EntityId = string;

/** @format date-time */
export type Timestamp = string;

/** @minLength 1 @maxLength 255 */
export type ProductName = string;

/** @minLength 1 @maxLength 1000 */
export type ProductDescription = string;

/** @minimum 0.01 */
export type Price = number;

/** @minimum 0 */
export type Quantity = number;

/** @minLength 1 @maxLength 100 */
export type CustomerName = string;

/** @format email */
export type Email = string;

/** @minLength 1 @maxLength 500 */
export type Address = string;

// Product domain
export type Product = {
  id: EntityId;
  name: ProductName;
  description: ProductDescription;
  price: Price;
  stock: Quantity;
  imageUrl?: string;
  category: ProductCategory;
  status: ProductStatus;
};

export type ProductCategory =
  | { kind: 'Electronics' }
  | { kind: 'Clothing' }
  | { kind: 'Books' }
  | { kind: 'Home' }
  | { kind: 'Sports' }
  | { kind: 'Other'; name: string };

export type ProductStatus =
  | { kind: 'Active' }
  | { kind: 'OutOfStock' }
  | { kind: 'Discontinued' };

// Shopping Cart domain
export type CartItem = {
  productId: EntityId;
  quantity: Quantity;
  priceAtAdd: Price;
};

export type Cart = {
  id: EntityId;
  customerId?: EntityId;
  items: CartItem[];
  createdAt: Timestamp;
  expiresAt?: Timestamp;
};

// Order domain
export type Order = {
  id: EntityId;
  customerId: EntityId;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billing: BillingInfo;
  status: OrderStatus;
  totals: OrderTotals;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type OrderItem = {
  productId: EntityId;
  productName: ProductName;
  quantity: Quantity;
  unitPrice: Price;
  subtotal: Price;
};

export type ShippingAddress = {
  name: CustomerName;
  street: Address;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type BillingInfo = {
  cardLastFour: string;
  cardType: 'Visa' | 'MasterCard' | 'Amex' | 'Other';
  billingAddress: ShippingAddress;
};

export type OrderStatus =
  | { kind: 'Pending' }
  | { kind: 'PaymentProcessing' }
  | { kind: 'PaymentFailed'; reason: string }
  | { kind: 'Confirmed'; confirmedAt: Timestamp }
  | { kind: 'Shipped'; shippedAt: Timestamp; trackingNumber: string }
  | { kind: 'Delivered'; deliveredAt: Timestamp }
  | { kind: 'Cancelled'; cancelledAt: Timestamp; reason: string }
  | { kind: 'Refunded'; refundedAt: Timestamp; amount: Price };

export type OrderTotals = {
  subtotal: Price;
  tax: Price;
  shipping: Price;
  total: Price;
};

// Customer domain
export type Customer = {
  id: EntityId;
  name: CustomerName;
  email: Email;
  addresses: ShippingAddress[];
  orderHistory: EntityId[];
  createdAt: Timestamp;
};

// Inventory events (for stock management)
export type InventoryReservation = {
  orderId: EntityId;
  productId: EntityId;
  quantity: Quantity;
  reservedAt: Timestamp;
  expiresAt: Timestamp;
};