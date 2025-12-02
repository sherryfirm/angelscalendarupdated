# Firebase Realtime Database Optimization Guide
## Staying Under Free-Tier Limits (Spark Plan)

### 📊 Free Tier Limits (as of 2025)
- **Simultaneous connections**: 100
- **GB stored**: 1 GB
- **GB downloaded**: 10 GB/month
- **No limit on reads/writes** (but bandwidth is limited)

### 🎯 Key Optimization Strategies

---

## 1. Listeners & Queries Optimization

### ❌ Common Mistakes
```javascript
// BAD: Listening to entire large nodes repeatedly
database.ref('users').on('value', (snapshot) => {
  // Downloads ALL users every time ANY user changes
  const allUsers = snapshot.val();
});

// BAD: Multiple listeners on the same path
database.ref('messages').on('value', listener1);
database.ref('messages').on('value', listener2);
database.ref('messages').on('value', listener3);
```

### ✅ Optimized Approach

#### Use Granular Event Listeners
Instead of `on('value')` which downloads entire nodes, use specific events:

```javascript
// GOOD: Listen to specific events
const messagesRef = database.ref('messages');

// Only downloads new messages as they're added
messagesRef.on('child_added', (snapshot) => {
  const newMessage = snapshot.val();
  console.log('New message:', newMessage);
  // Add to UI without re-fetching everything
});

messagesRef.on('child_changed', (snapshot) => {
  const updatedMessage = snapshot.val();
  console.log('Updated message:', updatedMessage);
  // Update specific item in UI
});

messagesRef.on('child_removed', (snapshot) => {
  const removedMessageId = snapshot.key;
  console.log('Removed message:', removedMessageId);
  // Remove from UI
});
```

#### Use Query Limits
```javascript
// GOOD: Fetch only what you need
const recentMessagesRef = database.ref('messages')
  .orderByChild('timestamp')
  .limitToLast(20); // Only fetch last 20 messages

recentMessagesRef.once('value', (snapshot) => {
  snapshot.forEach((child) => {
    console.log(child.val());
  });
});
```

#### Single Listener Per Path
```javascript
// GOOD: Use one listener and share the data
class MessageManager {
  constructor() {
    this.listeners = [];
    this.messagesRef = database.ref('messages').limitToLast(50);

    // Single database listener
    this.messagesRef.on('child_added', (snapshot) => {
      const message = { id: snapshot.key, ...snapshot.val() };
      // Notify all subscribed components
      this.notifyListeners('added', message);
    });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(type, data) {
    this.listeners.forEach(callback => callback(type, data));
  }

  cleanup() {
    this.messagesRef.off(); // Remove database listener
  }
}

// Usage in multiple components
const messageManager = new MessageManager();
const unsubscribe = messageManager.subscribe((type, message) => {
  if (type === 'added') {
    // Update UI
  }
});
```

**Reads Saved**: Instead of 3 listeners × 50 messages = 150 reads, you only use 50 reads.

---

## 2. Data Caching Strategies

### Enable Offline Persistence
```javascript
// Enable offline persistence (caches data automatically)
import { initializeApp } from 'firebase/app';
import { getDatabase, enableDatabasePersistence } from 'firebase/database';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Enable persistence (web only)
if (typeof window !== 'undefined') {
  enableDatabasePersistence(database)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser doesn\'t support persistence');
      }
    });
}
```

### Manual Client-Side Caching
```javascript
class CachedDataManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  async getData(path, forceRefresh = false) {
    const now = Date.now();
    const cachedData = this.cache.get(path);
    const cacheTime = this.cacheTimestamps.get(path);

    // Return cached data if fresh
    if (!forceRefresh && cachedData && (now - cacheTime) < this.CACHE_DURATION) {
      console.log('Returning cached data for:', path);
      return cachedData;
    }

    // Fetch from Firebase
    console.log('Fetching fresh data for:', path);
    const snapshot = await database.ref(path).once('value');
    const data = snapshot.val();

    // Update cache
    this.cache.set(path, data);
    this.cacheTimestamps.set(path, now);

    return data;
  }

  invalidateCache(path) {
    this.cache.delete(path);
    this.cacheTimestamps.delete(path);
  }

  clearAll() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

// Usage
const cacheManager = new CachedDataManager();

// First call fetches from Firebase
const userData = await cacheManager.getData('users/user123');

// Second call within 5 minutes returns cached data (0 reads!)
const cachedUserData = await cacheManager.getData('users/user123');
```

### Local Storage Cache
```javascript
class LocalStorageCache {
  static set(key, data, expiryMinutes = 30) {
    const item = {
      data: data,
      expiry: Date.now() + (expiryMinutes * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  static get(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return item.data;
  }

  static async getOrFetch(key, fetchFunction, expiryMinutes = 30) {
    // Try cache first
    const cached = this.get(key);
    if (cached) {
      console.log('Cache hit:', key);
      return cached;
    }

    // Fetch and cache
    console.log('Cache miss, fetching:', key);
    const data = await fetchFunction();
    this.set(key, data, expiryMinutes);
    return data;
  }
}

// Usage
const userProfile = await LocalStorageCache.getOrFetch(
  'user_profile_123',
  async () => {
    const snapshot = await database.ref('users/user123').once('value');
    return snapshot.val();
  },
  60 // Cache for 60 minutes
);
```

**Reads Saved**: If data is accessed 10 times but cached, you save 9 reads (90% reduction).

---

## 3. Data Structure Optimization

### ❌ Nested Data (Inefficient)
```javascript
// BAD: Deep nesting
{
  "users": {
    "user123": {
      "name": "John",
      "posts": {
        "post1": { "title": "Hello", "content": "..." },
        "post2": { "title": "World", "content": "..." }
        // Reading user downloads ALL posts!
      },
      "comments": { /* ... */ },
      "likes": { /* ... */ }
    }
  }
}
```

### ✅ Flattened Structure (Efficient)
```javascript
// GOOD: Flat, denormalized structure
{
  "users": {
    "user123": {
      "name": "John",
      "email": "john@example.com"
      // No nested data
    }
  },
  "posts": {
    "post1": {
      "userId": "user123",
      "title": "Hello",
      "content": "..."
    }
  },
  "user-posts": {
    "user123": {
      "post1": true,
      "post2": true
      // Just IDs, not full data
    }
  }
}
```

### Segmented Data for Pagination
```javascript
// Structure messages by time segments
{
  "messages": {
    "2025-01": {
      "msg1": { "text": "Hello", "timestamp": 1704067200 },
      "msg2": { "text": "Hi", "timestamp": 1704153600 }
    },
    "2025-02": {
      "msg3": { "text": "Hey", "timestamp": 1706745600 }
    }
  }
}

// Fetch only current month
const currentMonth = '2025-01';
const snapshot = await database.ref(`messages/${currentMonth}`).once('value');
```

### Use Firebase Storage for Large Files
```javascript
// ❌ BAD: Storing files in database
await database.ref('photos/photo1').set({
  base64Data: "data:image/png;base64,iVBORw0KG..." // Huge!
});

// ✅ GOOD: Store in Firebase Storage, reference in database
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();
const imageRef = ref(storage, 'photos/photo1.jpg');

// Upload to Storage
await uploadBytes(imageRef, imageFile);
const downloadURL = await getDownloadURL(imageRef);

// Store only URL in database
await database.ref('photos/photo1').set({
  url: downloadURL,
  uploadedAt: Date.now(),
  uploadedBy: 'user123'
});
```

**Reads Saved**: Fetching a user profile downloads 1KB instead of 100KB+ with nested data.

---

## 4. Event Optimization & Batching

### Debounce Rapid Updates
```javascript
// Prevent excessive writes that trigger reads for listeners
class DebouncedWriter {
  constructor(delay = 1000) {
    this.delay = delay;
    this.timers = new Map();
  }

  write(path, data) {
    // Clear existing timer
    if (this.timers.has(path)) {
      clearTimeout(this.timers.get(path));
    }

    // Set new timer
    const timer = setTimeout(() => {
      database.ref(path).set(data);
      this.timers.delete(path);
    }, this.delay);

    this.timers.set(path, timer);
  }
}

const writer = new DebouncedWriter(2000);

// User types in search box - only write after 2s of inactivity
searchInput.addEventListener('input', (e) => {
  writer.write('users/user123/searchQuery', e.target.value);
});
```

### Batch Read Operations
```javascript
// ❌ BAD: Multiple individual reads
const user1 = await database.ref('users/user1').once('value');
const user2 = await database.ref('users/user2').once('value');
const user3 = await database.ref('users/user3').once('value');
// 3 reads

// ✅ GOOD: Single read at parent level
const usersSnapshot = await database.ref('users').once('value');
const users = usersSnapshot.val();
const user1 = users.user1;
const user2 = users.user2;
const user3 = users.user3;
// 1 read (if users list is small)
```

### Pagination for Large Lists
```javascript
class PaginatedList {
  constructor(path, pageSize = 20) {
    this.path = path;
    this.pageSize = pageSize;
    this.lastKey = null;
  }

  async loadNextPage() {
    let query = database.ref(this.path)
      .orderByKey()
      .limitToFirst(this.pageSize + 1); // +1 to check if more exist

    if (this.lastKey) {
      query = query.startAfter(this.lastKey);
    }

    const snapshot = await query.once('value');
    const items = [];
    let count = 0;

    snapshot.forEach((child) => {
      if (count < this.pageSize) {
        items.push({ id: child.key, ...child.val() });
        this.lastKey = child.key;
      }
      count++;
    });

    const hasMore = count > this.pageSize;

    return { items, hasMore };
  }

  reset() {
    this.lastKey = null;
  }
}

// Usage
const messageList = new PaginatedList('messages', 20);
const page1 = await messageList.loadNextPage(); // Loads 20 items
const page2 = await messageList.loadNextPage(); // Loads next 20
```

**Reads Saved**: Loading 100 items in 5 pages of 20 = 100 reads vs. loading all at once then not using them.

---

## 5. Monitoring & Usage Tracking

### Track Read Operations
```javascript
class ReadCounter {
  constructor() {
    this.counts = {
      total: 0,
      byPath: {},
      bySession: 0
    };
    this.sessionStart = Date.now();
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Intercept Firebase reads
    const originalOnce = firebase.database.Reference.prototype.once;
    const self = this;

    firebase.database.Reference.prototype.once = function(...args) {
      self.incrementCount(this.path.toString());
      return originalOnce.apply(this, args);
    };
  }

  incrementCount(path) {
    this.counts.total++;
    this.counts.bySession++;
    this.counts.byPath[path] = (this.counts.byPath[path] || 0) + 1;

    // Check if approaching limits
    if (this.counts.bySession > 1000) {
      console.warn('⚠️ High read count this session:', this.counts.bySession);
    }

    // Log to console in development
    console.log(`📖 Read #${this.counts.total}: ${path}`);
  }

  getReport() {
    const sessionDuration = (Date.now() - this.sessionStart) / 1000 / 60;
    return {
      totalReads: this.counts.total,
      sessionReads: this.counts.bySession,
      sessionDurationMinutes: sessionDuration.toFixed(2),
      readsPerMinute: (this.counts.bySession / sessionDuration).toFixed(2),
      topPaths: Object.entries(this.counts.byPath)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }

  reset() {
    this.counts.bySession = 0;
    this.sessionStart = Date.now();
  }
}

// Usage
const readCounter = new ReadCounter();

// View report in console
console.table(readCounter.getReport());
```

### Server-Side Usage Logging (Cloud Functions)
```javascript
// Track reads per user using Cloud Functions
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.logDatabaseRead = functions.database
  .ref('/{path}')
  .onRead((event) => {
    const userId = event.auth ? event.auth.uid : 'anonymous';
    const path = event.path;
    const timestamp = Date.now();

    // Log to separate analytics node
    return admin.database()
      .ref(`analytics/reads/${userId}/${timestamp}`)
      .set({
        path: path,
        timestamp: timestamp
      });
  });
```

### Daily Usage Dashboard
```javascript
class UsageDashboard {
  async getDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await database.ref(`analytics/daily/${today}`).once('value');
    const stats = snapshot.val() || { reads: 0, writes: 0 };

    const FREE_TIER_BANDWIDTH = 10 * 1024 * 1024 * 1024; // 10 GB
    const estimatedBandwidth = stats.reads * 1024; // Rough estimate

    return {
      reads: stats.reads,
      writes: stats.writes,
      estimatedBandwidthMB: (estimatedBandwidth / 1024 / 1024).toFixed(2),
      percentOfLimit: ((estimatedBandwidth / FREE_TIER_BANDWIDTH) * 100).toFixed(2),
      warning: estimatedBandwidth > (FREE_TIER_BANDWIDTH * 0.8)
    };
  }

  async showDashboard() {
    const stats = await this.getDailyStats();
    console.log('📊 Daily Usage Report');
    console.log('─'.repeat(40));
    console.log(`Reads: ${stats.reads}`);
    console.log(`Writes: ${stats.writes}`);
    console.log(`Est. Bandwidth: ${stats.estimatedBandwidthMB} MB`);
    console.log(`% of Free Tier: ${stats.percentOfLimit}%`);

    if (stats.warning) {
      console.warn('⚠️ WARNING: Approaching free tier limits!');
    }
  }
}
```

---

## 6. Best Practices Summary

### ✅ DO
1. **Use `.once('value')` instead of `.on('value')`** when you only need data once
2. **Detach listeners** when components unmount or data is no longer needed
3. **Use query limits** (`limitToLast()`, `limitToFirst()`) for large lists
4. **Enable offline persistence** to reduce network reads
5. **Cache frequently accessed data** client-side
6. **Flatten your data structure** to minimize read payloads
7. **Use Firebase Storage** for files, not Realtime Database
8. **Monitor your usage** regularly

### ❌ DON'T
1. Don't use `.on('value')` on large parent nodes
2. Don't create multiple listeners for the same data
3. Don't store large files in the database
4. Don't fetch data on every component render
5. Don't read entire collections when you only need specific items
6. Don't nest data more than 2-3 levels deep
7. Don't forget to detach listeners (memory leaks + continued reads)

---

## 📈 Expected Read Reductions

| Strategy | Typical Reduction |
|----------|------------------|
| Using `child_added` instead of `value` | 70-90% |
| Client-side caching (5 min TTL) | 80-95% |
| Query limits (50 instead of all) | 50-99% |
| Offline persistence | 30-60% |
| Flattened structure | 40-70% |
| Single listener pattern | 50-90% |

### Example Calculation
**Before optimization:**
- 5 users × 100 page views/day × 10 reads/page = **5,000 reads/day**
- Estimated bandwidth: ~50 MB/day

**After optimization:**
- Caching reduces reads by 80%: 1,000 reads/day
- Query limits reduce remaining by 60%: 400 reads/day
- **Final: ~400 reads/day** (~4 MB bandwidth)

This keeps you well within free-tier limits with room to grow to 50+ users.

---

## 🚀 Quick Start Checklist

- [ ] Enable offline persistence
- [ ] Replace `on('value')` with `child_added/changed/removed` where possible
- [ ] Add query limits to all list queries
- [ ] Implement client-side caching for static/slow-changing data
- [ ] Flatten deeply nested data structures
- [ ] Move files to Firebase Storage
- [ ] Set up read monitoring
- [ ] Detach all listeners on cleanup
- [ ] Test with Firebase Emulator to verify read counts

---

## 📚 Additional Resources
- [Firebase Database Best Practices](https://firebase.google.com/docs/database/usage/best-practices)
- [Structure Your Database](https://firebase.google.com/docs/database/web/structure-data)
- [Work with Lists of Data](https://firebase.google.com/docs/database/web/lists-of-data)
