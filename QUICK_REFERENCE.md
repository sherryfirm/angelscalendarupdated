# Firebase Optimization Quick Reference

Quick reference for optimizing Firebase Realtime Database reads and bandwidth.

## 🔥 Free Tier Limits (Spark Plan)

| Resource | Limit |
|----------|-------|
| Storage | 1 GB |
| Bandwidth | 10 GB/month |
| Connections | 100 simultaneous |

## ⚡ Quick Wins (Implement These First)

### 1. Add Query Limits (5 minutes)
```javascript
// ❌ Before
const snapshot = await get(ref(db, 'messages'));

// ✅ After
const snapshot = await get(
  query(ref(db, 'messages'), limitToLast(50))
);
// Saves: 90-99% of reads if you have lots of data
```

### 2. Enable Caching (2 minutes)
```javascript
import { MemoryCache } from './examples/caching-strategies.js';

const cache = new MemoryCache();

// Use cache.get() instead of direct Firebase reads
const data = await cache.get('user_123',
  async () => {
    const snap = await get(ref(db, 'users/123'));
    return snap.val();
  },
  5 * 60 * 1000 // Cache 5 minutes
);
// Saves: 80-95% of repeated reads
```

### 3. Use Granular Events (10 minutes)
```javascript
// ❌ Before: Downloads everything on every change
onValue(ref(db, 'messages'), (snapshot) => {
  // All 1000 messages downloaded
});

// ✅ After: Downloads only changes
onChildAdded(ref(db, 'messages'), (snapshot) => {
  // Only new message downloaded
});

onChildChanged(ref(db, 'messages'), (snapshot) => {
  // Only changed message downloaded
});
// Saves: 70-90% of listener reads
```

## 📊 Optimization Patterns

### Pattern: User Profile Loading
```javascript
// ❌ Bad: Nested data
{
  "users": {
    "user123": {
      "name": "John",
      "posts": { /* 100 posts */ },
      "comments": { /* 500 comments */ }
    }
  }
}
// Reading user = 50 KB

// ✅ Good: Flat structure
{
  "users": {
    "user123": { "name": "John" }
  },
  "userPosts": {
    "user123": { "post1": true, ... }
  }
}
// Reading user = 0.1 KB (500× smaller!)
```

### Pattern: Message Feed
```javascript
// ❌ Bad: Load all messages
const messages = await get(ref(db, 'messages'));
// 10,000 messages × 1 KB = 10 MB

// ✅ Good: Load recent with limit
const messages = await get(
  query(
    ref(db, 'messages'),
    orderByChild('timestamp'),
    limitToLast(20)
  )
);
// 20 messages × 1 KB = 20 KB (500× smaller!)
```

### Pattern: Real-time Updates
```javascript
// ❌ Bad: Poll every second
setInterval(async () => {
  const snap = await get(ref(db, 'status'));
}, 1000);
// 86,400 reads/day per user

// ✅ Good: Use listeners
onValue(ref(db, 'status'), (snapshot) => {
  // Only reads when data changes
});
// ~10-100 reads/day per user (1000× better!)
```

### Pattern: File Storage
```javascript
// ❌ Bad: Store in database
await set(ref(db, 'images/img1'), {
  data: "base64..." // 500 KB in database
});

// ✅ Good: Use Storage
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();
const imgRef = ref(storage, 'images/img1.jpg');
await uploadBytes(imgRef, file);
const url = await getDownloadURL(imgRef);

await set(ref(db, 'images/img1'), {
  url: url // ~100 bytes in database
});
// 5000× smaller database payload!
```

## 🎣 React Hooks

### Hook: Cached Data
```javascript
function useFirebaseData(path, ttl = 300000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cache.get(path,
      async () => {
        const snap = await get(ref(db, path));
        return snap.val();
      },
      ttl
    ).then(result => {
      setData(result);
      setLoading(false);
    });
  }, [path, ttl]);

  return { data, loading };
}

// Usage
function UserProfile({ userId }) {
  const { data, loading } = useFirebaseData(`users/${userId}`);
  // Cached for 5 minutes by default
}
```

### Hook: Optimized Listener
```javascript
function useRealtimeData(path, limit = 50) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const dbRef = query(
      ref(db, path),
      orderByChild('timestamp'),
      limitToLast(limit)
    );

    const unsubscribe = onChildAdded(dbRef, (snap) => {
      setItems(prev => [...prev, { id: snap.key, ...snap.val() }]);
    });

    return unsubscribe;
  }, [path, limit]);

  return items;
}

// Usage
function MessageList() {
  const messages = useRealtimeData('messages', 50);
  // Only loads last 50, updates in real-time
}
```

## 🛠️ Monitoring One-Liners

### Track Reads
```javascript
import { ReadCounter } from './examples/monitoring-usage.js';
const counter = new ReadCounter();

// Wrap Firebase calls
const data = await get(ref(db, path));
counter.trackRead(path, 'once', JSON.stringify(data.val()).length);

// View report
counter.printReport();
```

### Monitor Usage Component
```javascript
function UsageDisplay() {
  const [reads, setReads] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const report = readCounter.getReport();
      setReads(report.session.reads);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return <div style={{
    position: 'fixed',
    top: 10,
    right: 10,
    background: reads > 500 ? 'red' : 'green',
    color: 'white',
    padding: 10,
    borderRadius: 5
  }}>
    Reads: {reads}
  </div>;
}
```

## 📦 Copy-Paste Solutions

### Solution: Complete Caching Setup
```javascript
import { SmartCacheManager } from './examples/caching-strategies.js';

const cache = new SmartCacheManager();

// Use everywhere instead of direct get()
async function getData(path) {
  return cache.getData(path, {
    memoryTTL: 5 * 60 * 1000,  // 5 min
    storageTTL: 60              // 1 hour
  });
}

// That's it! 80-95% read reduction
```

### Solution: Shared Listeners
```javascript
import { FirebaseListenerManager } from './examples/optimized-listeners.js';

const manager = new FirebaseListenerManager();

// In component 1
const unsub1 = manager.subscribe('messages', callback1);

// In component 2 (shares same DB listener!)
const unsub2 = manager.subscribe('messages', callback2);

// Cleanup
unsub1();
unsub2();

// 50-90% listener read reduction
```

### Solution: Usage Monitoring
```javascript
import { ReadCounter, TrackedFirebase } from './examples/monitoring-usage.js';

const counter = new ReadCounter();
const db = new TrackedFirebase(counter);

// Use db.get() instead of get()
const data = await db.get('users/123');

// View stats anytime
console.table(counter.getReport());

// Set up alerts
setInterval(() => {
  const report = counter.getReport();
  if (report.session.reads > 1000) {
    alert('⚠️ High read count!');
  }
}, 60000);
```

## 🚨 Debug Checklist

### High Read Count?
1. ✅ Check for listeners without cleanup
2. ✅ Check for `on('value')` on large nodes
3. ✅ Verify query limits are applied
4. ✅ Check if caching is enabled
5. ✅ Look for polling/intervals
6. ✅ Check for reads in render loops

### High Bandwidth?
1. ✅ Check data structure (nested?)
2. ✅ Verify files not stored in DB
3. ✅ Check for large text fields
4. ✅ Verify query limits
5. ✅ Check if loading more than needed

### Approaching Limits?
```javascript
// Quick calculation
const DAILY_READS = 800;
const AVG_READ_SIZE = 1024; // bytes
const DAILY_BANDWIDTH = DAILY_READS * AVG_READ_SIZE;
const MONTHLY_BANDWIDTH = DAILY_BANDWIDTH * 30;
const FREE_TIER_GB = 10;

console.log('Monthly bandwidth:', (MONTHLY_BANDWIDTH / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('% of free tier:', ((MONTHLY_BANDWIDTH / (FREE_TIER_GB * 1024 * 1024 * 1024)) * 100).toFixed(1), '%');
```

## 📏 Rules of Thumb

### Data Structure
- **Max nesting**: 2-3 levels
- **Individual node**: < 10 KB
- **List items**: < 1 KB each
- **Text fields**: < 10 KB
- **Use Storage for**: > 100 KB

### Caching
- **User profiles**: 5-10 minutes
- **Config/settings**: 1-24 hours
- **Static content**: 24 hours
- **Real-time data**: 1-2 minutes
- **Volatile data**: Don't cache

### Query Limits
- **Initial load**: 20-50 items
- **Pagination**: 10-20 items
- **Real-time feed**: 50-100 items
- **History**: Load on demand

### Monitoring
- **Warning threshold**: 80% of limit
- **Critical threshold**: 95% of limit
- **Check frequency**: Every hour
- **Report frequency**: Daily

## 🎯 Target Metrics

For a small app (5 users):

| Metric | Target | Critical |
|--------|--------|----------|
| Daily reads | < 1,000 | > 5,000 |
| Daily bandwidth | < 50 MB | > 300 MB |
| Reads per user session | < 50 | > 200 |
| Cache hit rate | > 70% | < 30% |
| Listener count | < 10 | > 50 |

## 💉 Emergency Fixes

### If you're exceeding limits NOW:

```javascript
// 1. Immediately disable all non-critical listeners
allListeners.forEach(unsub => unsub());

// 2. Increase cache TTL to max
cache.CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// 3. Add aggressive query limits
// Find all .once('value') and add limitToLast(10)

// 4. Disable auto-refresh/polling
clearInterval(pollInterval);

// 5. Load data only on user action
button.addEventListener('click', () => {
  // Load data here
});
```

## 📚 See Also

- **Full Guide**: `FIREBASE_OPTIMIZATION_GUIDE.md`
- **Examples**: `examples/` folder
- **Complete App**: `examples/complete-optimized-app.js`

---

**Print this page and keep it handy!** 📄
