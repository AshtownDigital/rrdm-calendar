/**
 * Tests for string utility functions
 */

describe('String utility tests', () => {
  // Simple string utility tests
  test('String concatenation works', () => {
    expect('hello' + ' ' + 'world').toBe('hello world');
  });

  test('String template literals work', () => {
    const name = 'Jest';
    expect(`Hello ${name}`).toBe('Hello Jest');
  });

  test('String methods work', () => {
    const str = 'Hello World';
    expect(str.toLowerCase()).toBe('hello world');
    expect(str.toUpperCase()).toBe('HELLO WORLD');
    expect(str.split(' ')).toEqual(['Hello', 'World']);
  });

  test('Regular expressions work', () => {
    const pattern = /hello/i;
    expect(pattern.test('Hello World')).toBe(true);
    expect(pattern.test('Goodbye')).toBe(false);
  });
});
