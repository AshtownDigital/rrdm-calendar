/**
 * Tests for the cache utility
 */
const { Cache } = require('../../utils/cache');

describe('Cache Utility', () => {
  let cache;
  
  beforeEach(() => {
    // Create a new cache instance before each test
    cache = new Cache(60); // 60 seconds TTL
  });
  
  test('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });
  
  test('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });
  
  test('should delete values', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });
  
  test('should clear all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });
  
  test('should expire values after TTL', () => {
    jest.useFakeTimers();
    
    // Create a cache with 1 second TTL
    const shortCache = new Cache(1);
    shortCache.set('key1', 'value1');
    
    // Value should be available immediately
    expect(shortCache.get('key1')).toBe('value1');
    
    // Advance time by 1.1 seconds
    jest.advanceTimersByTime(1100);
    
    // Value should be expired now
    expect(shortCache.get('key1')).toBeNull();
    
    jest.useRealTimers();
  });
  
  test('should get or set values with getOrSet', async () => {
    const fetchFn = jest.fn().mockResolvedValue('fetched_value');
    
    // First call should fetch the value
    const result1 = await cache.getOrSet('key1', fetchFn);
    expect(result1).toBe('fetched_value');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    
    // Second call should use the cached value
    const result2 = await cache.getOrSet('key1', fetchFn);
    expect(result2).toBe('fetched_value');
    expect(fetchFn).toHaveBeenCalledTimes(1); // Still only called once
  });
});
