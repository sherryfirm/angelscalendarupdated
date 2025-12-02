/**
 * FIREBASE USAGE MONITORING & TRACKING
 * Track database reads, bandwidth, and usage patterns to stay within free-tier limits
 */

import { getDatabase, ref, get, onValue, set, update } from 'firebase/database';

// ============================================================================
// STRATEGY 1: Client-Side Read Counter
// ============================================================================

class ReadCounter {
  constructor() {
    this.stats = {
      total: 0,
      session: 0,
      byPath: {},
      byType: {
        once: 0,
        listener: 0
      },
      timeline: []
    };
    this.sessionStart = Date.now();
    this.warningThreshold = 1000; // Warn at 1000 reads per session
  }

  /**
   * Track a read operation
   */
  trackRead(path, type = 'once', bytesEstimate = 1024) {
    this.stats.total++;
    this.stats.session++;
    this.stats.byType[type]++;

    // Track by path
    if (!this.stats.byPath[path]) {
      this.stats.byPath[path] = { count: 0, bytes: 0 };
    }
    this.stats.byPath[path].count++;
    this.stats.byPath[path].bytes += bytesEstimate;

    // Add to timeline
    this.stats.timeline.push({
      timestamp: Date.now(),
      path,
      type,
      bytes: bytesEstimate
    });

    // Check warning threshold
    if (this.stats.session >= this.warningThreshold) {
      console.warn(`⚠️ WARNING: High read count this session: ${this.stats.session}`);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📖 Read #${this.stats.total} [${type}]: ${path} (~${(bytesEstimate / 1024).toFixed(2)}KB)`);
    }
  }

  /**
   * Get comprehensive report
   */
  getReport() {
    const sessionDuration = (Date.now() - this.sessionStart) / 1000 / 60; // minutes
    const totalBytes = Object.values(this.stats.byPath).reduce((sum, p) => sum + p.bytes, 0);

    // Get top paths by read count
    const topPaths = Object.entries(this.stats.byPath)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([path, data]) => ({
        path,
        reads: data.count,
        bandwidth: `${(data.bytes / 1024).toFixed(2)} KB`
      }));

    return {
      session: {
        reads: this.stats.session,
        durationMinutes: sessionDuration.toFixed(2),
        readsPerMinute: (this.stats.session / sessionDuration).toFixed(2),
        estimatedBandwidth: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
      },
      lifetime: {
        totalReads: this.stats.total
      },
      byType: this.stats.byType,
      topPaths,
      warnings: this.stats.session >= this.warningThreshold
    };
  }

  /**
   * Get reads over time (for graphing)
   */
  getTimeline(intervalMinutes = 1) {
    const buckets = {};
    const intervalMs = intervalMinutes * 60 * 1000;

    this.stats.timeline.forEach(entry => {
      const bucket = Math.floor(entry.timestamp / intervalMs) * intervalMs;
      if (!buckets[bucket]) {
        buckets[bucket] = { reads: 0, bytes: 0 };
      }
      buckets[bucket].reads++;
      buckets[bucket].bytes += entry.bytes;
    });

    return Object.entries(buckets).map(([timestamp, data]) => ({
      time: new Date(parseInt(timestamp)),
      reads: data.reads,
      bandwidthKB: (data.bytes / 1024).toFixed(2)
    }));
  }

  /**
   * Print formatted report to console
   */
  printReport() {
    const report = this.getReport();

    console.log('\n' + '='.repeat(60));
    console.log('📊 FIREBASE READ REPORT');
    console.log('='.repeat(60));

    console.log('\n📍 Session Stats:');
    console.log(`   Reads: ${report.session.reads}`);
    console.log(`   Duration: ${report.session.durationMinutes} minutes`);
    console.log(`   Rate: ${report.session.readsPerMinute} reads/minute`);
    console.log(`   Bandwidth: ${report.session.estimatedBandwidth}`);

    console.log('\n📈 By Type:');
    console.log(`   One-time reads: ${report.byType.once}`);
    console.log(`   Listener reads: ${report.byType.listener}`);

    console.log('\n🔥 Top Paths:');
    report.topPaths.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.path}`);
      console.log(`      Reads: ${item.reads} | Bandwidth: ${item.bandwidth}`);
    });

    if (report.warnings) {
      console.log('\n⚠️  WARNING: High read count detected!');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Reset session stats
   */
  resetSession() {
    this.stats.session = 0;
    this.stats.timeline = [];
    this.sessionStart = Date.now();
    console.log('🔄 Session stats reset');
  }

  /**
   * Export stats to JSON
   */
  exportStats() {
    return {
      ...this.stats,
      report: this.getReport(),
      exportedAt: new Date().toISOString()
    };
  }
}

// Global instance
const readCounter = new ReadCounter();

// ============================================================================
// STRATEGY 2: Interceptor for Automatic Tracking
// ============================================================================

class FirebaseInterceptor {
  constructor(readCounter) {
    this.readCounter = readCounter;
    this.installed = false;
  }

  /**
   * Install interceptors on Firebase methods
   */
  install() {
    if (this.installed) {
      console.warn('Interceptor already installed');
      return;
    }

    // Intercept get() (one-time reads)
    const originalGet = get;
    window._originalFirebaseGet = originalGet;

    window.get = async function(dbRef) {
      const path = dbRef.toString();
      const result = await originalGet(dbRef);

      // Estimate size
      const data = result.val();
      const sizeEstimate = data ? JSON.stringify(data).length : 0;

      readCounter.trackRead(path, 'once', sizeEstimate);

      return result;
    };

    // Note: Intercepting listeners is more complex and may not be reliable
    // Better to manually track in wrapper functions

    this.installed = true;
    console.log('✅ Firebase interceptor installed');
  }

  /**
   * Uninstall interceptors
   */
  uninstall() {
    if (!this.installed) return;

    if (window._originalFirebaseGet) {
      window.get = window._originalFirebaseGet;
    }

    this.installed = false;
    console.log('🛑 Firebase interceptor uninstalled');
  }
}

// ============================================================================
// STRATEGY 3: Wrapped Firebase Functions with Tracking
// ============================================================================

class TrackedFirebase {
  constructor(readCounter) {
    this.readCounter = readCounter;
    this.db = getDatabase();
  }

  /**
   * Tracked get()
   */
  async get(path) {
    const dbRef = ref(this.db, path);
    const snapshot = await get(dbRef);
    const data = snapshot.val();

    // Track read
    const size = data ? JSON.stringify(data).length : 0;
    this.readCounter.trackRead(path, 'once', size);

    return snapshot;
  }

  /**
   * Tracked onValue() with automatic unsubscribe tracking
   */
  onValue(path, callback, options = {}) {
    const dbRef = ref(this.db, path);
    let readCount = 0;

    const wrappedCallback = (snapshot) => {
      readCount++;
      const data = snapshot.val();
      const size = data ? JSON.stringify(data).length : 0;

      this.readCounter.trackRead(
        `${path} [listener #${readCount}]`,
        'listener',
        size
      );

      callback(snapshot);
    };

    const unsubscribe = onValue(dbRef, wrappedCallback, options);

    // Return wrapped unsubscribe that logs cleanup
    return () => {
      console.log(`🛑 Listener detached: ${path} (triggered ${readCount} times)`);
      unsubscribe();
    };
  }

  /**
   * Batch get with single read tracking
   */
  async batchGet(paths) {
    console.log(`📦 Batch reading ${paths.length} paths...`);

    const results = await Promise.all(
      paths.map(path => this.get(path))
    );

    return results.map((snapshot, i) => ({
      path: paths[i],
      data: snapshot.val()
    }));
  }
}

// Usage
const trackedDb = new TrackedFirebase(readCounter);

// These calls are automatically tracked
const userData = await trackedDb.get('users/user123');
const unsubscribe = trackedDb.onValue('messages', (snapshot) => {
  console.log('New messages:', snapshot.val());
});

// ============================================================================
// STRATEGY 4: Daily Usage Dashboard
// ============================================================================

class DailyUsageDashboard {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Log read operation to database (for analytics)
   */
  async logRead(userId, path, bytes) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = new Date().getHours();

    const updates = {};

    // Aggregate by day
    updates[`analytics/daily/${today}/reads`] = {
      '.sv': 'increment', // Increment counter
      [userId]: { '.sv': 'increment' }
    };

    updates[`analytics/daily/${today}/bytes`] = {
      '.sv': 'increment',
      [userId]: { '.sv': { increment: bytes } }
    };

    // Aggregate by hour
    updates[`analytics/hourly/${today}/${hour}/reads`] = {
      '.sv': 'increment'
    };

    await update(ref(this.db), updates);
  }

  /**
   * Get daily usage stats
   */
  async getDailyStats(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const snapshot = await get(ref(this.db, `analytics/daily/${targetDate}`));
    const data = snapshot.val() || {};

    const FREE_TIER_BANDWIDTH_GB = 10;
    const FREE_TIER_BANDWIDTH_BYTES = FREE_TIER_BANDWIDTH_GB * 1024 * 1024 * 1024;

    const totalBytes = data.bytes?.total || 0;
    const totalReads = data.reads?.total || 0;

    return {
      date: targetDate,
      reads: totalReads,
      bandwidthMB: (totalBytes / 1024 / 1024).toFixed(2),
      bandwidthGB: (totalBytes / 1024 / 1024 / 1024).toFixed(3),
      percentOfLimit: ((totalBytes / FREE_TIER_BANDWIDTH_BYTES) * 100).toFixed(2),
      warning: totalBytes > (FREE_TIER_BANDWIDTH_BYTES * 0.8),
      critical: totalBytes > (FREE_TIER_BANDWIDTH_BYTES * 0.95)
    };
  }

  /**
   * Get usage by user
   */
  async getUserUsage(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const snapshot = await get(ref(this.db, `analytics/daily/${targetDate}`));
    const data = snapshot.val() || {};

    const userStats = [];

    // Process user reads
    if (data.reads) {
      Object.entries(data.reads).forEach(([userId, reads]) => {
        if (userId !== 'total') {
          const bytes = data.bytes?.[userId] || 0;
          userStats.push({
            userId,
            reads,
            bandwidthMB: (bytes / 1024 / 1024).toFixed(2)
          });
        }
      });
    }

    return userStats.sort((a, b) => b.reads - a.reads);
  }

  /**
   * Display dashboard in console
   */
  async showDashboard() {
    const stats = await this.getDailyStats();
    const userStats = await getUserUsage();

    console.log('\n' + '='.repeat(60));
    console.log('📊 DAILY USAGE DASHBOARD');
    console.log('='.repeat(60));

    console.log(`\n📅 Date: ${stats.date}`);
    console.log(`📖 Total Reads: ${stats.reads.toLocaleString()}`);
    console.log(`📦 Bandwidth: ${stats.bandwidthMB} MB (${stats.bandwidthGB} GB)`);
    console.log(`📈 % of Free Tier: ${stats.percentOfLimit}%`);

    if (stats.critical) {
      console.log('\n🚨 CRITICAL: Near or exceeding free tier limits!');
    } else if (stats.warning) {
      console.log('\n⚠️  WARNING: Approaching 80% of free tier limits');
    } else {
      console.log('\n✅ Usage is within safe limits');
    }

    console.log('\n👥 Top Users:');
    userStats.slice(0, 5).forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.userId}`);
      console.log(`      Reads: ${user.reads} | Bandwidth: ${user.bandwidthMB} MB`);
    });

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Set up alerts (check periodically)
   */
  setupAlerts(checkIntervalMinutes = 60) {
    console.log(`🔔 Setting up usage alerts (checking every ${checkIntervalMinutes} minutes)`);

    const checkUsage = async () => {
      const stats = await this.getDailyStats();

      if (stats.critical) {
        this.sendAlert('CRITICAL', stats);
      } else if (stats.warning) {
        this.sendAlert('WARNING', stats);
      }
    };

    // Check immediately
    checkUsage();

    // Check periodically
    return setInterval(checkUsage, checkIntervalMinutes * 60 * 1000);
  }

  sendAlert(level, stats) {
    const message = `${level}: Firebase usage at ${stats.percentOfLimit}% of free tier limit`;
    console.error(`🚨 ${message}`);

    // You could integrate with email, SMS, or push notifications here
    // Example: send email via Firebase Functions or third-party service
  }
}

// ============================================================================
// STRATEGY 5: Real-time Usage Monitor Component (React)
// ============================================================================

function UsageMonitor() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const report = readCounter.getReport();
      setStats(report);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const warningLevel = stats.session.reads > 500 ? 'high' : 'normal';

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: warningLevel === 'high' ? '#ff4444' : '#4CAF50',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>📖 Reads: {stats.session.reads}</div>
      <div>⏱️ Rate: {stats.session.readsPerMinute}/min</div>
      <div>📦 Bandwidth: {stats.session.estimatedBandwidth}</div>
      {warningLevel === 'high' && <div>⚠️ High usage!</div>}
    </div>
  );
}

// ============================================================================
// STRATEGY 6: Usage Comparison & Recommendations
// ============================================================================

class UsageAnalyzer {
  constructor(readCounter) {
    this.readCounter = readCounter;
  }

  /**
   * Analyze usage patterns and provide recommendations
   */
  analyze() {
    const report = this.readCounter.getReport();
    const recommendations = [];

    // Check for high listener reads
    const listenerRatio = report.byType.listener / report.session.reads;
    if (listenerRatio > 0.7) {
      recommendations.push({
        priority: 'high',
        issue: 'High percentage of listener reads',
        suggestion: 'Consider using .once() for data that doesn\'t need real-time updates',
        impact: 'Could reduce reads by 50-70%'
      });
    }

    // Check for frequently accessed paths
    const topPath = report.topPaths[0];
    if (topPath && topPath.reads > 50) {
      recommendations.push({
        priority: 'high',
        issue: `Path "${topPath.path}" accessed ${topPath.reads} times`,
        suggestion: 'Implement client-side caching for this frequently accessed data',
        impact: 'Could reduce reads by 80-90%'
      });
    }

    // Check read rate
    const readsPerMinute = parseFloat(report.session.readsPerMinute);
    if (readsPerMinute > 20) {
      recommendations.push({
        priority: 'medium',
        issue: `High read rate: ${readsPerMinute} reads/minute`,
        suggestion: 'Consider batching reads or increasing cache TTL',
        impact: 'Could reduce reads by 40-60%'
      });
    }

    return {
      summary: report,
      recommendations,
      score: this.calculateEfficiencyScore(report)
    };
  }

  calculateEfficiencyScore(report) {
    // Score from 0-100, higher is better
    let score = 100;

    // Penalize high read rate
    const readsPerMinute = parseFloat(report.session.readsPerMinute);
    if (readsPerMinute > 20) score -= 30;
    else if (readsPerMinute > 10) score -= 15;

    // Penalize high listener ratio
    const listenerRatio = report.byType.listener / report.session.reads;
    if (listenerRatio > 0.7) score -= 20;

    // Penalize concentrated reads on single path
    if (report.topPaths[0]?.reads > report.session.reads * 0.5) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  printAnalysis() {
    const analysis = this.analyze();

    console.log('\n' + '='.repeat(60));
    console.log('🔍 USAGE ANALYSIS');
    console.log('='.repeat(60));

    console.log(`\n📊 Efficiency Score: ${analysis.score}/100`);

    if (analysis.recommendations.length === 0) {
      console.log('\n✅ No major issues detected!');
    } else {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
        console.log(`   💡 ${rec.suggestion}`);
        console.log(`   📈 ${rec.impact}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ReadCounter,
  readCounter,
  FirebaseInterceptor,
  TrackedFirebase,
  DailyUsageDashboard,
  UsageMonitor,
  UsageAnalyzer
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Initialize monitoring in your app
 */
async function initializeMonitoring() {
  // 1. Set up read counter
  const counter = new ReadCounter();

  // 2. Use tracked Firebase wrapper
  const db = new TrackedFirebase(counter);

  // 3. Set up daily dashboard
  const dashboard = new DailyUsageDashboard();
  await dashboard.showDashboard();

  // 4. Set up alerts
  dashboard.setupAlerts(60); // Check every hour

  // 5. Analyze usage periodically
  const analyzer = new UsageAnalyzer(counter);

  setInterval(() => {
    analyzer.printAnalysis();
  }, 30 * 60 * 1000); // Every 30 minutes

  return { counter, db, dashboard, analyzer };
}

/**
 * MONITORING BENEFITS:
 *
 * Without Monitoring:
 * - No visibility into read patterns
 * - Can't identify optimization opportunities
 * - May exceed free tier unexpectedly
 * - Difficult to debug performance issues
 *
 * With Monitoring:
 * - Track reads in real-time
 * - Identify "hot paths" that need caching
 * - Get alerts before exceeding limits
 * - Measure impact of optimizations
 * - Understand user behavior patterns
 *
 * Example Insights from Monitoring:
 * - "users/user123 accessed 200 times" → Add caching
 * - "70% of reads from listeners" → Consider using .once()
 * - "Reads spike every 5 minutes" → Reduce polling frequency
 * - "User456 generates 50% of reads" → Investigate their usage pattern
 */
