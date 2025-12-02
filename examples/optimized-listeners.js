/**
 * OPTIMIZED FIREBASE LISTENERS
 * Strategies to minimize database reads while maintaining real-time functionality
 */

import { getDatabase, ref, onChildAdded, onChildChanged, onChildRemoved, query, orderByChild, limitToLast, once } from 'firebase/database';

// ============================================================================
// STRATEGY 1: Use Specific Event Listeners Instead of 'value'
// ============================================================================

/**
 * BAD: Listening with 'value' downloads entire collection on every change
 */
function setupIneffientListeners_BAD() {
  const db = getDatabase();
  const messagesRef = ref(db, 'messages');

  // ❌ Downloads ALL messages every time ANY message changes
  onValue(messagesRef, (snapshot) => {
    const allMessages = [];
    snapshot.forEach((child) => {
      allMessages.push({ id: child.key, ...child.val() });
    });
    console.log('Downloaded all messages:', allMessages.length);
    // If you have 100 messages and 1 changes, you download 100 messages!
  });
}

/**
 * GOOD: Use child_added, child_changed, child_removed
 */
function setupOptimizedListeners_GOOD() {
  const db = getDatabase();
  const messagesRef = ref(db, 'messages');
  const messages = new Map();

  // ✅ Only downloads NEW messages
  const unsubscribeAdded = onChildAdded(messagesRef, (snapshot) => {
    const message = { id: snapshot.key, ...snapshot.val() };
    messages.set(snapshot.key, message);
    console.log('New message added:', message);
    // Add to UI - 1 read per new message
  });

  // ✅ Only downloads CHANGED messages
  const unsubscribeChanged = onChildChanged(messagesRef, (snapshot) => {
    const message = { id: snapshot.key, ...snapshot.val() };
    messages.set(snapshot.key, message);
    console.log('Message updated:', message);
    // Update in UI - 1 read per change
  });

  // ✅ Only notifies of REMOVED message ID
  const unsubscribeRemoved = onChildRemoved(messagesRef, (snapshot) => {
    messages.delete(snapshot.key);
    console.log('Message removed:', snapshot.key);
    // Remove from UI - 0 reads!
  });

  // Return cleanup function
  return () => {
    unsubscribeAdded();
    unsubscribeChanged();
    unsubscribeRemoved();
  };
}

// ============================================================================
// STRATEGY 2: Use Query Limits
// ============================================================================

/**
 * Fetch only the last N items instead of entire collection
 */
async function loadRecentMessages(limit = 20) {
  const db = getDatabase();
  const messagesRef = query(
    ref(db, 'messages'),
    orderByChild('timestamp'),
    limitToLast(limit)
  );

  const snapshot = await once(messagesRef, 'value');
  const messages = [];

  snapshot.forEach((child) => {
    messages.push({ id: child.key, ...child.val() });
  });

  console.log(`Loaded ${messages.length} messages (limited to ${limit})`);
  return messages;

  // If you have 1000 messages but only need 20, you save 980 reads!
}

/**
 * Setup listener with query limits
 */
function setupLimitedRealtimeListener(limit = 50) {
  const db = getDatabase();
  const messagesRef = query(
    ref(db, 'messages'),
    orderByChild('timestamp'),
    limitToLast(limit)
  );

  const messages = new Map();

  // Listen only to last N items
  const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
    messages.set(snapshot.key, { id: snapshot.key, ...snapshot.val() });
    console.log('New message (from last 50):', snapshot.key);
  });

  return unsubscribe;
}

// ============================================================================
// STRATEGY 3: Single Listener Manager (Avoid Duplicate Listeners)
// ============================================================================

/**
 * Centralized listener manager - single database listener shared by multiple components
 */
class FirebaseListenerManager {
  constructor() {
    this.listeners = new Map(); // path -> { dbUnsubscribe, subscribers: Set }
  }

  /**
   * Subscribe to a path - shares single database listener
   */
  subscribe(path, callback, queryConfig = {}) {
    const db = getDatabase();

    // Create listener if it doesn't exist
    if (!this.listeners.has(path)) {
      console.log('Creating new database listener for:', path);

      let dbRef = ref(db, path);

      // Apply query config
      if (queryConfig.orderBy && queryConfig.limit) {
        dbRef = query(
          dbRef,
          orderByChild(queryConfig.orderBy),
          limitToLast(queryConfig.limit)
        );
      }

      const subscribers = new Set();
      const listenerData = { subscribers };

      // Single database listener
      listenerData.dbUnsubscribeAdded = onChildAdded(dbRef, (snapshot) => {
        const data = { id: snapshot.key, ...snapshot.val() };
        // Notify all subscribers
        subscribers.forEach(cb => cb('added', data));
      });

      listenerData.dbUnsubscribeChanged = onChildChanged(dbRef, (snapshot) => {
        const data = { id: snapshot.key, ...snapshot.val() };
        subscribers.forEach(cb => cb('changed', data));
      });

      listenerData.dbUnsubscribeRemoved = onChildRemoved(dbRef, (snapshot) => {
        subscribers.forEach(cb => cb('removed', { id: snapshot.key }));
      });

      this.listeners.set(path, listenerData);
    }

    // Add subscriber
    const listenerData = this.listeners.get(path);
    listenerData.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      listenerData.subscribers.delete(callback);

      // Clean up database listener if no more subscribers
      if (listenerData.subscribers.size === 0) {
        console.log('Removing database listener for:', path);
        listenerData.dbUnsubscribeAdded();
        listenerData.dbUnsubscribeChanged();
        listenerData.dbUnsubscribeRemoved();
        this.listeners.delete(path);
      }
    };
  }

  /**
   * Get current subscriber count
   */
  getStats() {
    const stats = {};
    this.listeners.forEach((data, path) => {
      stats[path] = data.subscribers.size;
    });
    return stats;
  }
}

// Singleton instance
const listenerManager = new FirebaseListenerManager();

/**
 * Example usage in React components
 */
function MessagesComponent() {
  const [messages, setMessages] = React.useState([]);

  React.useEffect(() => {
    // Subscribe to messages
    const unsubscribe = listenerManager.subscribe(
      'messages',
      (type, data) => {
        if (type === 'added') {
          setMessages(prev => [...prev, data]);
        } else if (type === 'changed') {
          setMessages(prev => prev.map(m => m.id === data.id ? data : m));
        } else if (type === 'removed') {
          setMessages(prev => prev.filter(m => m.id !== data.id));
        }
      },
      { orderBy: 'timestamp', limit: 50 }
    );

    // Cleanup
    return unsubscribe;
  }, []);

  return <div>{/* Render messages */}</div>;
}

/**
 * MULTIPLE COMPONENTS using same listener
 */
function AnotherMessagesComponent() {
  const [messageCount, setMessageCount] = React.useState(0);

  React.useEffect(() => {
    // Shares the SAME database listener as MessagesComponent above!
    const unsubscribe = listenerManager.subscribe(
      'messages',
      (type, data) => {
        if (type === 'added') {
          setMessageCount(prev => prev + 1);
        }
      },
      { orderBy: 'timestamp', limit: 50 }
    );

    return unsubscribe;
  }, []);

  return <div>Total: {messageCount}</div>;
}

// ============================================================================
// STRATEGY 4: Conditional Loading with 'once' Instead of Listeners
// ============================================================================

/**
 * Use .once() when you don't need real-time updates
 */
async function loadUserProfile(userId) {
  const db = getDatabase();
  const userRef = ref(db, `users/${userId}`);

  // ✅ One-time read - no ongoing listener
  const snapshot = await once(userRef, 'value');
  const userData = snapshot.val();

  console.log('User profile loaded once:', userData);
  return userData;
}

/**
 * Smart component: load once, then setup listener
 */
class SmartDataLoader {
  constructor(path) {
    this.path = path;
    this.data = null;
    this.listeners = [];
  }

  /**
   * Initial load with .once()
   */
  async initialize() {
    const db = getDatabase();
    const snapshot = await once(ref(db, this.path), 'value');
    this.data = snapshot.val();
    console.log('Initial data loaded:', this.path);
    return this.data;
  }

  /**
   * Then setup real-time listener for changes
   */
  watchForChanges() {
    const db = getDatabase();
    const dbRef = ref(db, this.path);

    this.unsubscribe = onChildChanged(dbRef, (snapshot) => {
      // Update only changed items
      if (!this.data) this.data = {};
      this.data[snapshot.key] = snapshot.val();
      this.notifyListeners();
    });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.data));
  }

  cleanup() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

// Usage
const loader = new SmartDataLoader('messages');
await loader.initialize(); // 1 read
loader.watchForChanges(); // Only reads changes going forward

// ============================================================================
// STRATEGY 5: Pagination with Realtime Updates
// ============================================================================

class PaginatedRealtimeList {
  constructor(path, pageSize = 20) {
    this.path = path;
    this.pageSize = pageSize;
    this.items = [];
    this.lastKey = null;
    this.listeners = new Set();
  }

  /**
   * Load next page
   */
  async loadNextPage() {
    const db = getDatabase();
    let dbQuery = query(
      ref(db, this.path),
      orderByChild('timestamp'),
      limitToLast(this.pageSize + 1)
    );

    if (this.lastKey) {
      dbQuery = query(dbQuery, endBefore(this.lastKey));
    }

    const snapshot = await once(dbQuery, 'value');
    const newItems = [];

    snapshot.forEach((child) => {
      newItems.push({ id: child.key, ...child.val() });
    });

    // Reverse (limitToLast returns in ascending order)
    newItems.reverse();

    if (newItems.length > this.pageSize) {
      newItems.pop(); // Remove extra item
      this.lastKey = newItems[newItems.length - 1].id;
    } else {
      this.lastKey = null; // No more pages
    }

    this.items.push(...newItems);
    return {
      items: newItems,
      hasMore: this.lastKey !== null
    };
  }

  /**
   * Setup realtime listener for NEW items only (not paginated data)
   */
  watchForNew() {
    const db = getDatabase();
    const dbRef = query(
      ref(db, this.path),
      orderByChild('timestamp'),
      limitToLast(1)
    );

    this.unsubscribe = onChildAdded(dbRef, (snapshot) => {
      const newItem = { id: snapshot.key, ...snapshot.val() };

      // Only add if not already in list (avoid duplicates from initial load)
      if (!this.items.find(item => item.id === newItem.id)) {
        this.items.unshift(newItem);
        this.notifyListeners(newItem);
      }
    });
  }

  notifyListeners(newItem) {
    this.listeners.forEach(cb => cb(newItem));
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  cleanup() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

// ============================================================================
// Export
// ============================================================================

export {
  setupOptimizedListeners_GOOD,
  loadRecentMessages,
  setupLimitedRealtimeListener,
  FirebaseListenerManager,
  listenerManager,
  SmartDataLoader,
  PaginatedRealtimeList
};

/**
 * READS COMPARISON:
 *
 * Scenario: 100 messages, 3 components need access, user views app 10 times/day
 *
 * BAD APPROACH:
 * - 3 components × on('value') listener = 3 × 100 = 300 reads on mount
 * - Every new message: 3 × 100 = 300 reads
 * - 10 app views × 300 = 3,000 reads/day
 *
 * GOOD APPROACH (with these optimizations):
 * - Single listener × limitToLast(20) = 20 reads on mount
 * - Every new message: 1 read (child_added)
 * - With caching: 10 app views × 20 = 200 reads/day (first load only)
 *
 * SAVINGS: 3,000 → 200 = 93% reduction!
 */
