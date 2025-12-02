/**
 * DATA STRUCTURE OPTIMIZATION
 * Strategies for structuring Firebase data to minimize reads and bandwidth
 */

import { getDatabase, ref, set, get, push, update, child } from 'firebase/database';

// ============================================================================
// PROBLEM: Deep Nesting (INEFFICIENT)
// ============================================================================

/**
 * ❌ BAD: Nested structure
 * Reading a user downloads ALL their posts, comments, and metadata
 */
const BAD_STRUCTURE = {
  users: {
    user123: {
      name: "John Doe",
      email: "john@example.com",
      profile: {
        bio: "Developer",
        avatar: "data:image/png;base64..." // Large data!
      },
      posts: {
        post1: {
          title: "My First Post",
          content: "Lorem ipsum...",
          comments: {
            comment1: { text: "Great!", author: "user456" },
            comment2: { text: "Nice!", author: "user789" }
          }
        },
        post2: { /* ... */ },
        post3: { /* ... */ }
        // Reading user downloads ALL posts and ALL comments!
      },
      following: {
        user456: true,
        user789: true
        // ... 1000 more users
      }
    }
  }
};

// Reading this path: users/user123
// Downloads: User info + ALL posts + ALL comments + ALL following
// Size: Could be 100KB+ for active users!

// ============================================================================
// SOLUTION 1: Flatten and Denormalize
// ============================================================================

/**
 * ✅ GOOD: Flat structure with separate paths
 */
const GOOD_STRUCTURE = {
  // Core user info only (small, frequently accessed)
  users: {
    user123: {
      name: "John Doe",
      email: "john@example.com",
      avatarURL: "https://storage.googleapis.com/..." // URL, not data
    }
  },

  // User profiles (less frequently accessed)
  userProfiles: {
    user123: {
      bio: "Developer",
      location: "San Francisco",
      joinedAt: 1704067200
    }
  },

  // Posts stored separately
  posts: {
    post1: {
      authorId: "user123",
      title: "My First Post",
      content: "Lorem ipsum...",
      createdAt: 1704067200
    },
    post2: { /* ... */ }
  },

  // User's post IDs (lightweight index)
  userPosts: {
    user123: {
      post1: true,
      post2: true,
      post3: true
      // Just IDs, not full post data
    }
  },

  // Comments stored separately
  comments: {
    comment1: {
      postId: "post1",
      authorId: "user456",
      text: "Great!",
      createdAt: 1704067300
    }
  },

  // Post's comment IDs (lightweight index)
  postComments: {
    post1: {
      comment1: true,
      comment2: true
    }
  },

  // Following relationships (lightweight)
  following: {
    user123: {
      user456: true,
      user789: true
    }
  }
};

// Now reading users/user123 only downloads basic user info (~1KB)
// Posts loaded separately when needed

// ============================================================================
// SOLUTION 2: Segmented Data by Time
// ============================================================================

/**
 * Segment data by time periods to limit query scope
 */
class TimeSegmentedStorage {
  constructor(basePath) {
    this.basePath = basePath;
  }

  /**
   * Get segment key for a timestamp
   */
  getSegmentKey(timestamp = Date.now()) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Write to time-segmented path
   */
  async write(data, timestamp = Date.now()) {
    const db = getDatabase();
    const segment = this.getSegmentKey(timestamp);
    const itemRef = push(ref(db, `${this.basePath}/${segment}`));

    await set(itemRef, {
      ...data,
      timestamp
    });

    return itemRef.key;
  }

  /**
   * Read from specific time segment
   */
  async readSegment(segmentKey) {
    const db = getDatabase();
    const snapshot = await get(ref(db, `${this.basePath}/${segmentKey}`));
    return snapshot.val();
  }

  /**
   * Read current month only
   */
  async readCurrentMonth() {
    const currentSegment = this.getSegmentKey();
    return this.readSegment(currentSegment);
  }
}

// Usage
const messages = new TimeSegmentedStorage('messages');

// Write message (automatically segmented by current month)
await messages.write({ text: "Hello!", userId: "user123" });

// Read only current month's messages
const currentMessages = await messages.readCurrentMonth();
// Reads ~100 messages instead of entire history (10,000+ messages)

/**
 * Database structure:
 * {
 *   "messages": {
 *     "2025-01": {
 *       "msg1": { text: "Hello", timestamp: 1704067200 },
 *       "msg2": { text: "Hi", timestamp: 1704153600 }
 *     },
 *     "2025-02": {
 *       "msg3": { text: "Hey", timestamp: 1706745600 }
 *     }
 *   }
 * }
 */

// ============================================================================
// SOLUTION 3: Separate Metadata from Content
// ============================================================================

/**
 * Store large content separately from frequently accessed metadata
 */

// ❌ BAD: Everything together
const BAD_POST_STRUCTURE = {
  posts: {
    post1: {
      title: "My Post",
      author: "user123",
      likes: 42,
      viewCount: 1000,
      content: "Very long content..." // Large!
      // Reading likes/viewCount also downloads content
    }
  }
};

// ✅ GOOD: Separate metadata from content
const GOOD_POST_STRUCTURE = {
  // Lightweight metadata (frequently updated/read)
  postMetadata: {
    post1: {
      title: "My Post",
      author: "user123",
      likes: 42,
      viewCount: 1000,
      createdAt: 1704067200
    }
  },

  // Heavy content (read only when viewing post)
  postContent: {
    post1: {
      content: "Very long content...",
      htmlContent: "<p>Very long content...</p>"
    }
  }
};

class PostManager {
  /**
   * Load post list (lightweight)
   */
  async loadPostList() {
    const db = getDatabase();
    const snapshot = await get(ref(db, 'postMetadata'));
    const posts = [];

    snapshot.forEach(child => {
      posts.push({ id: child.key, ...child.val() });
    });

    return posts;
    // Loads 100 posts × 200 bytes = 20KB
    // vs. 100 posts × 5KB (with content) = 500KB
    // 96% bandwidth reduction!
  }

  /**
   * Load full post with content (when user clicks)
   */
  async loadFullPost(postId) {
    const db = getDatabase();

    const [metadataSnap, contentSnap] = await Promise.all([
      get(ref(db, `postMetadata/${postId}`)),
      get(ref(db, `postContent/${postId}`))
    ]);

    return {
      id: postId,
      ...metadataSnap.val(),
      ...contentSnap.val()
    };
  }

  /**
   * Update view count without reading content
   */
  async incrementViewCount(postId) {
    const db = getDatabase();
    const metadataRef = ref(db, `postMetadata/${postId}/viewCount`);

    const snapshot = await get(metadataRef);
    const currentCount = snapshot.val() || 0;

    await set(metadataRef, currentCount + 1);
    // Only reads/writes viewCount field, not entire post
  }
}

// ============================================================================
// SOLUTION 4: Use Indexes for Queries
// ============================================================================

/**
 * Create lightweight indexes for common queries
 */

class IndexedData {
  /**
   * Write post with automatic indexing
   */
  async createPost(postData) {
    const db = getDatabase();
    const postId = push(ref(db, 'posts')).key;
    const { authorId, tags, createdAt } = postData;

    const updates = {};

    // Main post data
    updates[`posts/${postId}`] = postData;

    // Index: Posts by author
    updates[`postsByAuthor/${authorId}/${postId}`] = true;

    // Index: Posts by tag
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => {
        updates[`postsByTag/${tag}/${postId}`] = true;
      });
    }

    // Index: Recent posts (for homepage)
    updates[`recentPosts/${-createdAt}/${postId}`] = {
      title: postData.title,
      authorId: authorId
    };

    // Atomic multi-path update
    await update(ref(db), updates);

    return postId;
  }

  /**
   * Get posts by author (fast lookup via index)
   */
  async getPostsByAuthor(authorId) {
    const db = getDatabase();

    // Get post IDs from index
    const indexSnap = await get(ref(db, `postsByAuthor/${authorId}`));
    const postIds = Object.keys(indexSnap.val() || {});

    // Load full post data (could optimize further with batching)
    const posts = await Promise.all(
      postIds.map(async (id) => {
        const snap = await get(ref(db, `posts/${id}`));
        return { id, ...snap.val() };
      })
    );

    return posts;
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tag, limit = 20) {
    const db = getDatabase();

    const indexSnap = await get(ref(db, `postsByTag/${tag}`));
    const postIds = Object.keys(indexSnap.val() || {}).slice(0, limit);

    const posts = await Promise.all(
      postIds.map(async (id) => {
        const snap = await get(ref(db, `posts/${id}`));
        return { id, ...snap.val() };
      })
    );

    return posts;
  }
}

// ============================================================================
// SOLUTION 5: Aggregated Data
// ============================================================================

/**
 * Precompute and store aggregated/summary data
 */

// ❌ BAD: Count on client (reads all items)
async function getPostCountBAD(userId) {
  const db = getDatabase();
  const snapshot = await get(ref(db, `userPosts/${userId}`));
  const posts = snapshot.val() || {};
  return Object.keys(posts).length;
  // Reads all post IDs just to count them
}

// ✅ GOOD: Store count separately
class AggregatedStats {
  /**
   * Create post and update count
   */
  async createPost(userId, postData) {
    const db = getDatabase();
    const postId = push(ref(db, 'posts')).key;

    const updates = {};
    updates[`posts/${postId}`] = postData;
    updates[`userPosts/${userId}/${postId}`] = true;

    // Update aggregated count
    const countRef = ref(db, `userStats/${userId}/postCount`);
    const countSnap = await get(countRef);
    const currentCount = countSnap.val() || 0;
    updates[`userStats/${userId}/postCount`] = currentCount + 1;

    await update(ref(db), updates);

    return postId;
  }

  /**
   * Get post count (fast, no iteration)
   */
  async getPostCount(userId) {
    const db = getDatabase();
    const snapshot = await get(ref(db, `userStats/${userId}/postCount`));
    return snapshot.val() || 0;
    // Single tiny read!
  }

  /**
   * Get all user stats at once
   */
  async getUserStats(userId) {
    const db = getDatabase();
    const snapshot = await get(ref(db, `userStats/${userId}`));
    return snapshot.val() || {
      postCount: 0,
      followerCount: 0,
      followingCount: 0
    };
    // Single read for all stats
  }
}

// ============================================================================
// SOLUTION 6: Use Firebase Storage for Large Files
// ============================================================================

import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

class FileManager {
  /**
   * Upload image to Storage, store URL in Database
   */
  async uploadProfilePicture(userId, imageFile) {
    // ❌ BAD: Store in database as base64
    // const base64 = await fileToBase64(imageFile);
    // await set(ref(db, `users/${userId}/avatar`), base64);
    // ^ This creates huge reads whenever user data is accessed!

    // ✅ GOOD: Upload to Storage
    const storage = getStorage();
    const imageRef = storageRef(storage, `avatars/${userId}.jpg`);

    // Upload file
    await uploadBytes(imageRef, imageFile);

    // Get download URL
    const downloadURL = await getDownloadURL(imageRef);

    // Store only URL in database
    const db = getDatabase();
    await set(ref(db, `users/${userId}/avatarURL`), downloadURL);

    return downloadURL;

    // Database now stores ~100 bytes (URL) instead of 500KB+ (image data)
  }

  /**
   * Upload post with images
   */
  async createPostWithImages(postData, imageFiles) {
    const storage = getStorage();
    const db = getDatabase();

    // Upload images to Storage
    const imageURLs = await Promise.all(
      imageFiles.map(async (file, index) => {
        const imageRef = storageRef(storage, `posts/${Date.now()}_${index}.jpg`);
        await uploadBytes(imageRef, file);
        return getDownloadURL(imageRef);
      })
    );

    // Store post with image URLs
    const postId = push(ref(db, 'posts')).key;
    await set(ref(db, `posts/${postId}`), {
      ...postData,
      imageURLs, // Array of URLs
      createdAt: Date.now()
    });

    return postId;
  }
}

// ============================================================================
// COMPLETE EXAMPLE: Optimized Blog Structure
// ============================================================================

const OPTIMIZED_BLOG_STRUCTURE = {
  // User profiles (basic info only)
  users: {
    user123: {
      name: "John Doe",
      username: "johndoe",
      avatarURL: "https://storage.googleapis.com/..."
    }
  },

  // Extended profile data (loaded separately)
  userProfiles: {
    user123: {
      bio: "Developer and writer",
      website: "https://johndoe.com",
      joinedAt: 1704067200
    }
  },

  // Aggregated user statistics
  userStats: {
    user123: {
      postCount: 42,
      followerCount: 150,
      followingCount: 89
    }
  },

  // Post metadata (lightweight, for lists)
  postMeta: {
    post1: {
      title: "How to Optimize Firebase",
      authorId: "user123",
      excerpt: "Learn strategies to reduce reads...",
      tags: ["firebase", "optimization"],
      createdAt: 1704067200,
      likes: 15,
      commentCount: 3
    }
  },

  // Post content (loaded only when viewing)
  postContent: {
    post1: {
      markdown: "# Full post content here...",
      html: "<h1>Full post content here...</h1>"
    }
  },

  // Time-segmented comments
  comments: {
    "2025-01": {
      comment1: {
        postId: "post1",
        authorId: "user456",
        text: "Great post!",
        createdAt: 1704067300
      }
    }
  },

  // Indexes
  postsByAuthor: {
    user123: {
      post1: true,
      post2: true
    }
  },

  postsByTag: {
    firebase: {
      post1: true
    }
  },

  // Recent posts (for homepage)
  recentPosts: {
    "-1704067200": { // Negative timestamp for reverse sort
      postId: "post1",
      title: "How to Optimize Firebase"
    }
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TimeSegmentedStorage,
  PostManager,
  IndexedData,
  AggregatedStats,
  FileManager,
  OPTIMIZED_BLOG_STRUCTURE
};

/**
 * DATA STRUCTURE OPTIMIZATION IMPACT:
 *
 * Scenario: Social app with users, posts, comments
 *
 * BAD STRUCTURE (nested):
 * - Load user profile: Downloads user + all posts + all comments = 50KB
 * - Load post feed (10 posts): 10 × 50KB = 500KB
 * - Total: ~500 reads (downloading nested data)
 *
 * GOOD STRUCTURE (flat):
 * - Load user profile: Downloads basic user info = 1KB
 * - Load post feed metadata (10 posts): 10 × 1KB = 10KB
 * - Load full post (on click): 1 × 5KB = 5KB
 * - Total: ~10 reads for feed, +1 read per viewed post
 *
 * BANDWIDTH SAVINGS: 500KB → 10KB = 98% reduction!
 * READ SAVINGS: 500 reads → 10 reads = 98% reduction!
 *
 * For 5 users viewing 10 posts/day:
 * - Before: 5 × 500 = 2,500 reads/day
 * - After: 5 × 10 = 50 reads/day
 * - TOTAL SAVINGS: 2,450 reads/day (98%)
 */
