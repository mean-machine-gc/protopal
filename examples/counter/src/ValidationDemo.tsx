import React, { useState } from 'react';
import { counter } from './system';
import { getCommandPayloadSchema, formatValidationErrors, z } from 'protopal/validation';

/**
 * Demo component showing form validation with Zod schemas
 */
export function ValidationDemo() {
  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  
  // Get validators for specific command types
  const incrementSchema = getCommandPayloadSchema(
    (counter as any).config.commandSchema,
    'Increment'
  );
  
  const targetSchema = getCommandPayloadSchema(
    (counter as any).config.commandSchema,
    'SetCountdownTarget'
  );
  
  const handleIncrement = () => {
    setErrors([]);
    const numAmount = parseInt(amount);
    
    if (incrementSchema) {
      const result = incrementSchema.safeParse({ amount: numAmount });
      if (!result.success) {
        setErrors(formatValidationErrors(result.error.format()));
        return;
      }
    }
    
    // Valid! Dispatch the command
    counter.dispatch({ 
      type: 'Increment', 
      payload: { amount: numAmount } 
    });
    setAmount('');
  };
  
  const handleSetTarget = () => {
    setErrors([]);
    const numTarget = parseInt(target);
    
    if (targetSchema) {
      const result = targetSchema.safeParse({ target: numTarget });
      if (!result.success) {
        setErrors(formatValidationErrors(result.error.format()));
        return;
      }
    }
    
    counter.dispatch({ 
      type: 'SetCountdownTarget', 
      payload: { target: numTarget } 
    });
    setTarget('');
  };
  
  const validateAmountField = () => {
    if (!amount) return;
    const numAmount = parseInt(amount);
    
    if (incrementSchema && !isNaN(numAmount)) {
      const result = incrementSchema.safeParse({ amount: numAmount });
      if (!result.success) {
        setErrors(formatValidationErrors(result.error.format()));
      } else {
        setErrors([]);
      }
    }
  };
  
  return (
    <div className="validation-demo">
      <h3>Form Validation Demo</h3>
      
      <div className="form-group">
        <label>Increment Amount (1-100):</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={validateAmountField}
          placeholder="Enter amount"
        />
        <button onClick={handleIncrement}>
          Increment
        </button>
      </div>
      
      <div className="form-group">
        <label>Countdown Target (1-1000):</label>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Enter target"
        />
        <button onClick={handleSetTarget}>
          Set Target
        </button>
      </div>
      
      {errors.length > 0 && (
        <div className="errors">
          <h4>Validation Errors:</h4>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="info">
        <p>Try entering invalid values:</p>
        <ul>
          <li>Negative numbers</li>
          <li>Numbers over the limit (100 for increment, 1000 for target)</li>
          <li>Non-numeric values</li>
        </ul>
        <p>The form will validate on blur and prevent invalid commands.</p>
      </div>
    </div>
  );
}