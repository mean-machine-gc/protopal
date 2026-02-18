/**
 * Protopal Validation
 * ===================
 * 
 * Command validation utilities using Zod
 */

// Re-export zod for convenience
export { z } from 'zod';
export type { ZodError, ZodIssue, ZodSchema } from 'zod';

import { z } from 'zod';
import type { Decider } from './protopal';

// ============================================================
// Validation Events
// ============================================================

export type ValidationError = {
  type: 'CommandValidationFailed';
  payload: {
    command: string;
    errors: z.ZodFormattedError<any>;
    issues: z.ZodIssue[];
  };
};

// ============================================================
// Command Schema Helpers
// ============================================================

/**
 * Helper to create discriminated union schemas for commands
 * 
 * @example
 * const schema = createCommandSchema([
 *   { type: 'Increment', payload: z.object({ amount: z.number().min(1) }) },
 *   { type: 'Reset' },
 * ]);
 */
export function createCommandSchema<T extends Array<{ type: string; payload?: z.ZodTypeAny }>>(
  commands: T
): z.ZodDiscriminatedUnion<'type', z.ZodDiscriminatedUnionOption<'type'>[]> {
  const schemas = commands.map(cmd => {
    const obj: any = { type: z.literal(cmd.type) };
    if (cmd.payload) {
      obj.payload = cmd.payload;
    }
    return z.object(obj);
  });
  
  return z.discriminatedUnion('type', schemas as any);
}

// ============================================================
// Validation Result Types
// ============================================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ValidationError };

// ============================================================
// Form Validation Helpers
// ============================================================

/**
 * Extract validator for a specific command type
 * Useful for form validation
 */
export function getCommandPayloadSchema<T = any>(
  schema: z.ZodSchema<any>,
  commandType: string
): z.ZodSchema<T> | undefined {
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = (schema as any)._def.options;
    const commandSchema = options.find((opt: any) => 
      opt._def.shape?.type?._def.value === commandType
    );
    
    if (commandSchema) {
      return commandSchema._def.shape?.payload;
    }
  }
  
  return undefined;
}

/**
 * Validate just the payload for a command type
 * Perfect for form validation before dispatching
 */
export function validateCommandPayload<T>(
  schema: z.ZodSchema<any>,
  commandType: string,
  payload: unknown
): ValidationResult<T> {
  const payloadSchema = getCommandPayloadSchema<T>(schema, commandType);
  
  if (!payloadSchema) {
    return {
      success: false,
      error: {
        type: 'CommandValidationFailed',
        payload: {
          command: commandType,
          errors: { _errors: [`No schema found for command type: ${commandType}`] },
          issues: [],
        },
      },
    };
  }
  
  const result = payloadSchema.safeParse(payload);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return {
      success: false,
      error: {
        type: 'CommandValidationFailed',
        payload: {
          command: commandType,
          errors: result.error.format(),
          issues: result.error.issues,
        },
      },
    };
  }
}

// ============================================================
// React Form Hook Helper
// ============================================================

/**
 * Helper for React forms with real-time validation
 * 
 * @example
 * const { errors, validate, isValid } = useCommandValidation(
 *   counterSchema,
 *   'Increment'
 * );
 */
export function createFormValidator<T>(
  schema: z.ZodSchema<any>,
  commandType: string
) {
  const payloadSchema = getCommandPayloadSchema<T>(schema, commandType);
  
  return {
    validate: (value: unknown): z.SafeParseReturnType<unknown, T> | null => {
      if (!payloadSchema) return null;
      return payloadSchema.safeParse(value);
    },
    
    getFieldError: (
      value: unknown,
      path: string[]
    ): string | undefined => {
      if (!payloadSchema) return undefined;
      
      const result = payloadSchema.safeParse(value);
      if (result.success) return undefined;
      
      const issue = result.error.issues.find(
        (i: z.ZodIssue) => i.path.join('.') === path.join('.')
      );
      
      return issue?.message;
    },
  };
}

// ============================================================
// Error Formatting
// ============================================================

/**
 * Format Zod errors for user-friendly display
 */
export function formatValidationErrors(
  error: z.ZodFormattedError<any>
): string[] {
  const messages: string[] = [];
  
  function traverse(obj: any, path: string[] = []): void {
    if (obj._errors && obj._errors.length > 0) {
      const fieldPath = path.length > 0 ? path.join('.') : 'Command';
      obj._errors.forEach((err: string) => {
        messages.push(`${fieldPath}: ${err}`);
      });
    }
    
    Object.keys(obj).forEach(key => {
      if (key !== '_errors' && typeof obj[key] === 'object') {
        traverse(obj[key], [...path, key]);
      }
    });
  }
  
  traverse(error);
  return messages;
}

/**
 * Get a single error message for a field
 */
export function getFieldErrorMessage(
  errors: z.ZodFormattedError<any>,
  field: string
): string | undefined {
  const parts = field.split('.');
  let current: any = errors;
  
  for (const part of parts) {
    current = current?.[part];
    if (!current) break;
  }
  
  return current?._errors?.[0];
}