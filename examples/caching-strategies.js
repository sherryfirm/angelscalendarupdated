/**
 * CLIENT-SIDE CACHING STRATEGIES
 * Reduce Firebase reads by caching data locally
 */

import { getDatabase, ref, onValue, once } from 'firebase/database';

// ============================================================================
// STRATEGY 1: In-Memory Cache with TTL (Time-To-Live)
// ============================================================================

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * Get data with automatic caching
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {number} ttlMs - Time to live in milliseconds
   */
  async get(key, fetchFn, ttlMs = 5 * 60 * 1000) {
    const now = Date.now();
    const cachedData = this.cache.get(key);
    const timestamp = this.timestamps.get(key);

    // Return cached data if still valid
    if (cachedData !== undefined && timestamp && (now - timestamp) < ttlMs) {
      console.log(`✅ Cache HIT: ${key} (age: ${((now - timestamp) / 1000).toFixed(1)}s)`);
      return cachedData;
    }

    // Fetch fresh data
    console.log(`❌ Cache MISS: ${key} - fetching from Firebase`);
    const data = await fetchFn();

    // Store in cache
    this.cache.set(key, data);
    this.timestamps.set(key, now);

    return data;
  }

  /**
   * Manually set cache value
   */
  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Invalidate cache for specific key
   */
  invalidate(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.timestamps.clear();
    console.log(`🗑️ Cache cleared: ${size} items removed`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      oldestEntry: this.getOldestEntry()
    };
  }

  getOldestEntry() {
    let oldest = null;
    let oldestTime = Date.now();

    this.timestamps.forEach((time, key) => {
      if (time < oldestTime) {
        oldestTime = time;
        oldest = key;
      }
    });

    return oldest ? {
      key: oldest,
      age: ((Date.now() - oldestTime) / 1000).toFixed(1) + 's'
    } : null;
  }
}

// Singleton instance
const memoryCache = new MemoryCache();

// Usage example
async function getUserProfile(userId) {
  return memoryCache.get(
    `user_${userId}`,
    async () => {
      const db = getDatabase();
      const snapshot = await once(ref(db, `users/${userId}`), 'value');
      return snapshot.val();
    },
    10 * 60 * 1000 // Cache for 10 minutes
  );
}

// ============================================================================
// STRATEGY 2: LocalStorage Cache (Persists across sessions)
// ============================================================================

class LocalStorageCache {
  constructor(prefix = 'firebase_cache_') {
    this.prefix = prefix;
    this.checkSupport();
  }

  checkSupport() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.supported = true;
    } catch (e) {
      console.warn('LocalStorage not supported');
      this.supported = false;
    }
  }

  /**
   * Generate cache key
   */
  getCacheKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item with expiry
   */
  set(key, data, expiryMinutes = 30) {
    if (!this.supported) return false;

    const item = {
      data: data,
      expiry: Date.now() + (expiryMinutes * 60 * 1000),
      cached: Date.now()
    };

    try {
      localStorage.setItem(this.getCacheKey(key), JSON.stringify(item));
      console.log(`💾 Cached to localStorage: ${key} (TTL: ${expiryMinutes}m)`);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old items');
        this.clearExpired();
      }
      return false;
    }
  }

  /**
   * Get item from cache
   */
  get(key) {
    if (!this.supported) return null;

    const itemStr = localStorage.getItem(this.getCacheKey(key));
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);

      // Check if expired
      if (Date.now() > item.expiry) {
        localStorage.removeItem(this.getCacheKey(key));
        console.log(`⏰ Cache expired: ${key}`);
        return null;
      }

      const age = ((Date.now() - item.cached) / 1000).toFixed(1);
      console.log(`✅ Cache HIT (localStorage): ${key} (age: ${age}s)`);
      return item.data;
    } catch (e) {
      console.error('Error parsing cached item:', e);
      return null;
    }
  }

  /**
   * Get or fetch with caching
   */
  async getOrFetch(key, fetchFn, expiryMinutes = 30) {
    // Try cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from Firebase
    console.log(`❌ Cache MISS (localStorage): ${key} - fetching`);
    const data = await fetchFn();

    // Cache result
    this.set(key, data, expiryMinutes);

    return data;
  }

  /**
   * Remove specific item
   */
  remove(key) {
    if (!this.supported) return;
    localStorage.removeItem(this.getCacheKey(key));
    console.log(`🗑️ Removed from cache: ${key}`);
  }

  /**
   * Clear all cached items
   */
  clearAll() {
    if (!this.supported) return;

    const keys = Object.keys(localStorage);
    let count = 0;

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
        count++;
      }
    });

    console.log(`🗑️ Cleared ${count} items from localStorage cache`);
  }

  /**
   * Clear only expired items
   */
  clearExpired() {
    if (!this.supported) return;

    const keys = Object.keys(localStorage);
    let count = 0;
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (now > item.expiry) {
            localStorage.removeItem(key);
            count++;
          }
        } catch (e) {
          // Remove corrupted items
          localStorage.removeItem(key);
          count++;
        }
      }
    });

    console.log(`🗑️ Cleared ${count} expired items`);
    return count;
  }

  /**
   * Get cache size and statistics
   */
  getStats() {
    if (!this.supported) return null;

    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith(this.prefix));
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    cacheKeys.forEach(key => {
      const item = localStorage.getItem(key);
      totalSize += item.length;

      try {
        const parsed = JSON.parse(item);
        if (now > parsed.expiry) expiredCount++;
      } catch (e) {}
    });

    return {
      items: cacheKeys.length,
      expired: expiredCount,
      sizeKB: (totalSize / 1024).toFixed(2),
      keys: cacheKeys.map(k => k.replace(this.prefix, ''))
    };
  }
}

// Singleton instance
const localStorageCache = new LocalStorageCache();

// Usage example
async function loadUserSettings(userId) {
  return localStorageCache.getOrFetch(
    `settings_${userId}`,
    async () => {
      const db = getDatabase();
      const snapshot = await once(ref(db, `userSettings/${userId}`), 'value');
      return snapshot.val();
    },
    60 // Cache for 1 hour
  );
}

// ============================================================================
// STRATEGY 3: Hybrid Cache (Memory + LocalStorage)
// ============================================================================

class HybridCache {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.storageCache = new LocalStorageCache();
  }

  /**
   * Get from cache (checks memory first, then localStorage, then fetches)
   */
  async get(key, fetchFn, options = {}) {
    const {
      memoryTTL = 5 * 60 * 1000,      // 5 minutes in memory
      storageTTL = 60                  // 60 minutes in localStorage
    } = options;

    // Try memory cache first (fastest)
    const memCached = this.memoryCache.cache.get(key);
    const memTimestamp = this.memoryCache.timestamps.get(key);

    if (memCached !== undefined && memTimestamp && (Date.now() - memTimestamp) < memoryTTL) {
      console.log(`⚡ Memory cache HIT: ${key}`);
      return memCached;
    }

    // Try localStorage (medium speed)
    const storageCached = this.storageCache.get(key);
    if (storageCached !== null) {
      // Update memory cache
      this.memoryCache.set(key, storageCached);
      console.log(`💾 Storage cache HIT: ${key} (promoted to memory)`);
      return storageCached;
    }

    // Fetch from Firebase (slowest)
    console.log(`🌐 Fetching from Firebase: ${key}`);
    const data = await fetchFn();

    // Store in both caches
    this.memoryCache.set(key, data);
    this.storageCache.set(key, data, storageTTL);

    return data;
  }

  /**
   * Invalidate key from all caches
   */
  invalidate(key) {
    this.memoryCache.invalidate(key);
    this.storageCache.remove(key);
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.memoryCache.clear();
    this.storageCache.clearAll();
  }

  /**
   * Get combined statistics
   */
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      storage: this.storageCache.getStats()
    };
  }
}

// Singleton instance
const hybridCache = new HybridCache();

// ============================================================================
// STRATEGY 4: Cache with Real-time Invalidation
// ============================================================================

class CacheWithRealtimeSync {
  constructor() {
    this.cache = new HybridCache();
    this.listeners = new Map();
  }

  /**
   * Get data and setup listener to invalidate cache on changes
   */
  async getWithSync(path, fetchFn, options = {}) {
    const cacheKey = `sync_${path}`;

    // Get cached or fetch
    const data = await this.cache.get(cacheKey, fetchFn, options);

    // Setup listener if not already listening
    if (!this.listeners.has(path)) {
      const db = getDatabase();
      const dbRef = ref(db, path);

      // Listen for changes to invalidate cache
      const unsubscribe = onValue(dbRef, (snapshot) => {
        console.log(`🔄 Data changed at ${path}, invalidating cache`);
        this.cache.invalidate(cacheKey);
      }, { onlyOnce: false });

      this.listeners.set(path, unsubscribe);
    }

    return data;
  }

  /**
   * Cleanup listener
   */
  stopSync(path) {
    const unsubscribe = this.listeners.get(path);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(path);
      console.log(`🛑 Stopped syncing: ${path}`);
    }
  }

  /**
   * Cleanup all listeners
   */
  stopAllSync() {
    this.listeners.forEach((unsubscribe, path) => {
      unsubscribe();
      console.log(`🛑 Stopped syncing: ${path}`);
    });
    this.listeners.clear();
  }
}

const syncedCache = new CacheWithRealtimeSync();

// ============================================================================
// STRATEGY 5: Request Deduplication (Prevent Simultaneous Duplicate Requests)
// ============================================================================

class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  /**
   * Execute request, or wait for existing request if already in flight
   */
  async fetch(key, fetchFn) {
    // Check if request already in flight
    if (this.pending.has(key)) {
      console.log(`⏳ Request already in flight: ${key}, waiting...`);
      return this.pending.get(key);
    }

    // Execute request
    console.log(`🚀 Starting new request: ${key}`);
    const promise = fetchFn()
      .then(result => {
        this.pending.delete(key);
        return result;
      })
      .catch(error => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear pending request
   */
  clear(key) {
    this.pending.delete(key);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      pendingRequests: this.pending.size,
      keys: Array.from(this.pending.keys())
    };
  }
}

const deduplicator = new RequestDeduplicator();

// ============================================================================
// STRATEGY 6: Smart Cache Manager (All-in-One Solution)
// ============================================================================

class SmartCacheManager {
  constructor() {
    this.cache = new HybridCache();
    this.deduplicator = new RequestDeduplicator();
    this.stats = {
      hits: 0,
      misses: 0,
      fetchCount: 0,
      savedReads: 0
    };
  }

  /**
   * Get data with full optimization
   */
  async getData(path, options = {}) {
    const {
      memoryTTL = 5 * 60 * 1000,
      storageTTL = 60,
      forceRefresh = false
    } = options;

    const cacheKey = `data_${path}`;

    if (forceRefresh) {
      this.cache.invalidate(cacheKey);
    }

    // Wrap in deduplicator
    return this.deduplicator.fetch(cacheKey, async () => {
      return this.cache.get(
        cacheKey,
        async () => {
          this.stats.misses++;
          this.stats.fetchCount++;
          console.log(`📡 Fetching from Firebase: ${path}`);

          const db = getDatabase();
          const snapshot = await once(ref(db, path), 'value');
          return snapshot.val();
        },
        { memoryTTL, storageTTL }
      );
    }).then(data => {
      if (data !== undefined) {
        this.stats.hits++;
        const hitRate = ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1);
        console.log(`📊 Cache hit rate: ${hitRate}% (${this.stats.savedReads} reads saved)`);
      }
      return data;
    });
  }

  /**
   * Preload data into cache
   */
  async preload(paths, options = {}) {
    console.log(`🔄 Preloading ${paths.length} paths...`);
    const promises = paths.map(path => this.getData(path, options));
    await Promise.all(promises);
    console.log(`✅ Preload complete`);
  }

  /**
   * Get statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cache: this.cache.getStats(),
      pending: this.deduplicator.getStats()
    };
  }

  /**
   * Clear everything
   */
  clearAll() {
    this.cache.clearAll();
    this.stats = {
      hits: 0,
      misses: 0,
      fetchCount: 0,
      savedReads: 0
    };
  }
}

// Global instance
const cacheManager = new SmartCacheManager();

// ============================================================================
// REACT HOOKS EXAMPLES
// ============================================================================

/**
 * Custom React hook for cached Firebase data
 */
function useCachedFirebaseData(path, options = {}) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    cacheManager.getData(path, options)
      .then(result => {
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [path]);

  const refresh = React.useCallback(() => {
    setLoading(true);
    return cacheManager.getData(path, { ...options, forceRefresh: true })
      .then(result => {
        setData(result);
        setLoading(false);
        return result;
      });
  }, [path, options]);

  return { data, loading, error, refresh };
}

// Usage in React component
function UserProfile({ userId }) {
  const { data: user, loading, refresh } = useCachedFirebaseData(`users/${userId}`, {
    memoryTTL: 5 * 60 * 1000,  // 5 minutes
    storageTTL: 60              // 1 hour
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MemoryCache,
  memoryCache,
  LocalStorageCache,
  localStorageCache,
  HybridCache,
  hybridCache,
  CacheWithRealtimeSync,
  syncedCache,
  RequestDeduplicator,
  deduplicator,
  SmartCacheManager,
  cacheManager,
  useCachedFirebaseData
};

/**
 * CACHING IMPACT ANALYSIS:
 *
 * Without Caching:
 * - User opens app 10 times/day
 * - Each load fetches user profile: 10 reads
 * - Each load fetches 50 messages: 500 reads
 * - Total: 510 reads/day per user
 * - 5 users = 2,550 reads/day
 *
 * With Memory Cache (5 min TTL):
 * - First load: 51 reads (profile + messages)
 * - Next loads within 5 min: 0 reads (cached)
 * - Assuming user sessions < 5 min: 51 reads/session
 * - 10 sessions: ~510 reads/day per user (if sessions spaced out)
 * - BUT typical usage: 2-3 sessions/day = ~150 reads/day per user
 * - 5 users = 750 reads/day
 * - SAVINGS: 71% reduction
 *
 * With LocalStorage Cache (1 hour TTL):
 * - First load of day: 51 reads
 * - Rest of day: 0 reads (from localStorage)
 * - 5 users = 255 reads/day
 * - SAVINGS: 90% reduction!
 *
 * Best Practice: Use Hybrid Cache (memory + localStorage)
 */
