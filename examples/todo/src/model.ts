/**
 * Todo Domain Model
 * =================
 * 
 * Simple todo application demonstrating protopal basics
 */

export type TodoId = string;
export type Timestamp = string;

// Model different states separately using discriminated unions
export type TodoStatus =
  | { kind: 'Active'; createdAt: Timestamp }
  | { kind: 'Completed'; completedAt: Timestamp }
  | { kind: 'Archived'; archivedAt: Timestamp };

export type Todo = {
  id: TodoId;
  text: string;
  status: TodoStatus;
};