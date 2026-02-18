/**
 * Domain Model
 * ============
 * 
 * Define your domain types here using discriminated unions.
 * This is the source of truth for your application.
 */

/** @format uuid */
export type EntityId = string;

/** @format date-time */
export type Timestamp = string;

/** @minLength 1 @maxLength 100 */
export type ItemName = string;

// Use discriminated unions for different states
export type ItemStatus =
  | { kind: 'Active' }
  | { kind: 'Completed'; completedAt: Timestamp }
  | { kind: 'Archived'; archivedAt: Timestamp; reason: string };

// Model your domain entities
export type Item = {
  id: EntityId;
  name: ItemName;
  status: ItemStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// Example: Different item types with specific fields
export type ItemType =
  | {
      kind: 'Task';
      dueDate?: Timestamp;
      priority: 'low' | 'medium' | 'high';
    }
  | {
      kind: 'Note';
      tags: string[];
    }
  | {
      kind: 'Reminder';
      alertAt: Timestamp;
      recurring: boolean;
    };