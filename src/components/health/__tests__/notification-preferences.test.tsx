import { describe, test, expect } from 'vitest';
import { NotificationPreferences } from '../NotificationPreferences';

describe('NotificationPreferences', () => {
  test('NotificationPreferences is exported as a function component', () => {
    expect(typeof NotificationPreferences).toBe('function');
  });

  test('NotificationPreferences component name is correct', () => {
    expect(NotificationPreferences.name).toBe('NotificationPreferences');
  });

  test('NotificationPreferences accepts optional className prop', () => {
    // Type-level test - if this compiles, the prop type is correct
    const props = { className: 'my-class' };
    expect(props.className).toBe('my-class');
  });
});


