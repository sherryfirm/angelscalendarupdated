# Sponsored Post Tracking - Test Plan

## Overview

This document provides comprehensive test cases for the Sponsored Post Tracking feature, covering all functionality, edge cases, and mobile responsiveness.

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Functional Testing](#functional-testing)
3. [Firebase Read Testing](#firebase-read-testing)
4. [Mobile Responsiveness Testing](#mobile-responsiveness-testing)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)
6. [Performance Testing](#performance-testing)
7. [Acceptance Criteria](#acceptance-criteria)

---

## Test Environment Setup

### Prerequisites
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Internet connection
- Firebase project with proper permissions
- Calendar app loaded with sample data

### Test Data Preparation

Create the following test calendar items:

```javascript
// Test Item 1: Fully configured sponsored post
{
  date: '2026-04-15',
  type: 'content',
  title: 'Nike Summer Campaign',
  isSponsored: true,
  sponsorName: 'Nike',
  sponsorType: 'Brand Partnership',
  obligations: {
    reel: { required: 3, posts: [
      { url: 'https://instagram.com/reel/test1', dateAdded: '2026-04-10T10:00:00Z' },
      { url: 'https://instagram.com/reel/test2', dateAdded: '2026-04-11T14:30:00Z' }
    ]},
    story: { required: 5, posts: [] }
  }
}

// Test Item 2: Sponsored with no obligations
{
  date: '2026-04-20',
  type: 'promo',
  title: 'Coca-Cola Promo',
  isSponsored: true,
  sponsorName: 'Coca-Cola',
  sponsorType: 'Product Placement',
  obligations: {}
}

// Test Item 3: Regular (non-sponsored) item
{
  date: '2026-04-25',
  type: 'content',
  title: 'Regular Post',
  isSponsored: false
}
```

### Browser Console Setup

Open browser DevTools (F12) and enable:
- Console logging
- Network monitoring
- Firebase requests filtering (`firestore.googleapis.com`)

---

## Functional Testing

### Test Suite 1: Creating Sponsored Posts

#### Test 1.1: Create New Sponsored Post
**Steps:**
1. Click "ADD ITEM" button in header
2. Fill in:
   - Date: 2026-05-01
   - Type: CONTENT
   - Title: "Test Sponsored Post"
3. Scroll to "MARK AS SPONSORED POST" section
4. Check the checkbox
5. Verify section expands
6. Enter Sponsor Name: "TestBrand"
7. Enter Sponsor Type: "Test Partnership"
8. Click "ADD ITEM"

**Expected Results:**
- ✅ Item added to calendar
- ✅ Item has 💲 dollar sign icon
- ✅ Item has cyan border
- ✅ Hover shows "SPONSORED" tooltip
- ✅ Item appears in Sponsored view when opened
- ✅ Console shows: 1 Firebase write, 0 reads
- ✅ localStorage updated with new item

**Status:** [ ] Pass [ ] Fail

---

#### Test 1.2: Edit Existing Item to Make It Sponsored
**Steps:**
1. Click any regular calendar item (non-sponsored)
2. In edit modal, check "MARK AS SPONSORED POST"
3. Fill sponsor details
4. Click "UPDATE ITEM"

**Expected Results:**
- ✅ Item now shows 💲 icon and cyan border
- ✅ Item appears in Sponsored view
- ✅ Original item details preserved (date, title, assignees, etc.)
- ✅ 1 Firebase write, 0 reads

**Status:** [ ] Pass [ ] Fail

---

#### Test 1.3: Uncheck Sponsored on Existing Sponsored Item
**Steps:**
1. Click sponsored item
2. Uncheck "MARK AS SPONSORED POST"
3. Save changes

**Expected Results:**
- ✅ 💲 icon removed
- ✅ Cyan border removed
- ✅ Item no longer in Sponsored view
- ✅ Sponsor fields hidden but data preserved in Firebase
- ✅ Obligations preserved (not deleted)

**Status:** [ ] Pass [ ] Fail

---

### Test Suite 2: Sponsored View Navigation

#### Test 2.1: Open Sponsored View
**Steps:**
1. Click "SPONSORED" button in header (cyan button)
2. Observe modal opens

**Expected Results:**
- ✅ Modal opens with "SPONSORED POSTS" header
- ✅ All sponsored items listed
- ✅ Non-sponsored items NOT shown
- ✅ Console shows: 0 Firebase reads
- ✅ Items sorted by date (optional: verify order)

**Status:** [ ] Pass [ ] Fail

---

#### Test 2.2: Empty State Display
**Steps:**
1. Ensure no calendar items are marked as sponsored
2. Click "SPONSORED" button

**Expected Results:**
- ✅ Modal opens
- ✅ Empty state message: "No sponsored posts yet"
- ✅ Helpful message displayed
- ✅ 💲 icon shown (grayed out)
- ✅ No error in console

**Status:** [ ] Pass [ ] Fail

---

#### Test 2.3: Close Sponsored View
**Steps:**
1. Open Sponsored view
2. Click X button in top-right
3. Verify modal closes

**Expected Results:**
- ✅ Modal closes smoothly
- ✅ Calendar view still visible behind
- ✅ No state errors in console

**Status:** [ ] Pass [ ] Fail

---

### Test Suite 3: Obligations Management

#### Test 3.1: Add New Obligation
**Steps:**
1. Open Sponsored view
2. Find a sponsored item
3. Click "▼ EXPAND DETAILS"
4. In "Add New Obligation" section:
   - Type: "reel"
   - Quantity: 4
5. Click "ADD"

**Expected Results:**
- ✅ New obligation appears in list
- ✅ Shows "REEL 0/4 completed"
- ✅ Progress bar at 0% (yellow)
- ✅ "Add post URL" input field visible
- ✅ Console: 1 Firebase write, 0 reads
- ✅ Form resets to default (reel, 1)

**Status:** [ ] Pass [ ] Fail

---

#### Test 3.2: Add Multiple Different Obligation Types
**Steps:**
1. Expand sponsored item
2. Add obligation: type="reel", quantity=3
3. Add obligation: type="story", quantity=5
4. Add obligation: type="carousel", quantity=2
5. Add obligation: type="post", quantity=10

**Expected Results:**
- ✅ All 4 obligations appear
- ✅ Each shows correct required count
- ✅ All start at 0/X completed
- ✅ Overall progress shows total (e.g., "0/20 posts")
- ✅ Each obligation has independent progress bar

**Status:** [ ] Pass [ ] Fail

---

#### Test 3.3: Delete Obligation
**Steps:**
1. Expand sponsored item with obligations
2. Click 🗑️ (trash) icon next to obligation type name
3. Confirm deletion in browser prompt

**Expected Results:**
- ✅ Confirmation prompt appears
- ✅ Obligation removed from list
- ✅ All linked posts for that obligation deleted
- ✅ Overall progress recalculated
- ✅ Console: 1 Firebase write, 0 reads

**Status:** [ ] Pass [ ] Fail

---

#### Test 3.4: Cancel Obligation Deletion
**Steps:**
1. Click 🗑️ icon
2. Click "Cancel" in confirmation prompt

**Expected Results:**
- ✅ Obligation NOT deleted
- ✅ Data unchanged
- ✅ No Firebase operations

**Status:** [ ] Pass [ ] Fail

---

### Test Suite 4: Post Linking

#### Test 4.1: Add Post URL (Keyboard Entry)
**Steps:**
1. Expand sponsored item
2. Find obligation with < 100% completion
3. Click in "Paste post URL..." input
4. Type: `https://instagram.com/reel/test123`
5. Press Enter

**Expected Results:**
- ✅ URL added to posts list
- ✅ Date shown (e.g., "Apr 10")
- ✅ Completed count increases (e.g., "1/4")
- ✅ Progress bar updates
- ✅ Input field clears
- ✅ Console: 1 Firebase write, 0 reads

**Status:** [ ] Pass [ ] Fail

---

#### Test 4.2: Add Post URL (Button Click)
**Steps:**
1. Expand sponsored item
2. Type URL in input: `https://tiktok.com/@user/video/123`
3. Click "ADD" button (don't press Enter)

**Expected Results:**
- ✅ Same results as Test 4.1
- ✅ URL added successfully
- ✅ Progress updates

**Status:** [ ] Pass [ ] Fail

---

#### Test 4.3: Add Multiple Posts to Same Obligation
**Steps:**
1. Add post URL: `https://instagram.com/reel/abc`
2. Add post URL: `https://instagram.com/reel/def`
3. Add post URL: `https://instagram.com/reel/ghi`

**Expected Results:**
- ✅ All 3 posts appear in list
- ✅ Each has unique date/time
- ✅ Progress: "3/X completed"
- ✅ Progress bar updates proportionally
- ✅ Posts shown in chronological order (newest first or oldest first)

**Status:** [ ] Pass [ ] Fail

---

#### Test 4.4: Complete Obligation (Reach 100%)
**Steps:**
1. Find obligation with required=3, completed=2
2. Add one more post URL
3. Observe progress reaches 3/3

**Expected Results:**
- ✅ Progress bar turns green
- ✅ Shows "3/3 completed"
- ✅ "Add post URL" input disappears
- ✅ Overall progress recalculates
- ✅ Message or indicator shows completion (optional)

**Status:** [ ] Pass [ ] Fail

---

#### Test 4.5: Delete Post URL
**Steps:**
1. Find obligation with linked posts
2. Click 🗑️ icon next to a post URL
3. Observe update

**Expected Results:**
- ✅ Post removed from list
- ✅ Completed count decreases (e.g., "2/4" → "1/4")
- ✅ Progress bar updates
- ✅ If was at 100%, "Add post URL" input reappears
- ✅ Console: 1 Firebase write, 0 reads

**Status:** [ ] Pass [ ] Fail

---

#### Test 4.6: Click Post URL to Open
**Steps:**
1. Find a linked post
2. Click the URL (blue clickable link)

**Expected Results:**
- ✅ URL opens in new browser tab
- ✅ Target page loads (Instagram, TikTok, etc.)
- ✅ Original tab remains on calendar

**Status:** [ ] Pass [ ] Fail

---

### Test Suite 5: Progress Calculation

#### Test 5.1: Single Obligation Progress
**Steps:**
1. Create obligation: reel, required=4
2. Add 0 posts → Check progress
3. Add 1 post → Check progress
4. Add 2nd post → Check progress
5. Add 3rd post → Check progress
6. Add 4th post → Check progress

**Expected Results:**
- ✅ 0/4: 0% - Yellow bar
- ✅ 1/4: 25% - Yellow bar
- ✅ 2/4: 50% - Cyan bar
- ✅ 3/4: 75% - Cyan bar
- ✅ 4/4: 100% - Green bar
- ✅ Percentages accurate

**Status:** [ ] Pass [ ] Fail

---

#### Test 5.2: Overall Progress with Multiple Obligations
**Steps:**
1. Add obligations:
   - reel: required=4 (add 2 posts)
   - story: required=6 (add 3 posts)
2. Check overall progress display

**Expected Results:**
- ✅ Shows "5/10 posts (50%)"
- ✅ Overall bar at 50% (cyan)
- ✅ Individual obligations show correct percentages:
  - reel: 2/4 (50%)
  - story: 3/6 (50%)

**Status:** [ ] Pass [ ] Fail

---

#### Test 5.3: Progress After Deletion
**Steps:**
1. Obligation with 3/4 completed
2. Delete 1 post
3. Check progress

**Expected Results:**
- ✅ Progress: 2/4 (50%)
- ✅ Overall progress recalculated
- ✅ Bar updates immediately

**Status:** [ ] Pass [ ] Fail

---

### Test Suite 6: Calendar Integration

#### Test 6.1: Sponsored Indicator - Month View
**Steps:**
1. Navigate to Month view
2. Find date with sponsored item
3. Observe visual indicators

**Expected Results:**
- ✅ 💲 icon appears before/after title
- ✅ Cyan border (2px, ring-2 ring-cyan-400/60)
- ✅ Hover shows "SPONSORED" in tooltip
- ✅ Regular items don't have these indicators

**Status:** [ ] Pass [ ] Fail

---

#### Test 6.2: Sponsored Indicator - Week View
**Steps:**
1. Switch to Week view
2. Find sponsored item

**Expected Results:**
- ✅ Same indicators as month view
- ✅ 💲 icon visible
- ✅ Cyan border
- ✅ Tooltip works

**Status:** [ ] Pass [ ] Fail

---

#### Test 6.3: Sponsored Indicator - Day View
**Steps:**
1. Switch to Day view
2. Navigate to day with sponsored item

**Expected Results:**
- ✅ "SPONSORED" badge shown (cyan bg, white text)
- ✅ Badge appears next to type badge
- ✅ Cyan border on full card
- ✅ 💲 icon in badge

**Status:** [ ] Pass [ ] Fail

---

#### Test 6.4: Sponsored Indicator - Day Modal
**Steps:**
1. In month view, click a day with sponsored item
2. Day modal opens
3. Observe sponsored item

**Expected Results:**
- ✅ "SPONSORED" badge visible
- ✅ Cyan border on item card
- ✅ Same styling as day view
- ✅ Distinguishable from regular items

**Status:** [ ] Pass [ ] Fail

---

#### Test 6.5: Edit from Sponsored View
**Steps:**
1. Open Sponsored view
2. Click "EDIT" button on item card
3. Modal opens

**Expected Results:**
- ✅ Sponsored view closes
- ✅ Edit modal opens
- ✅ All fields populated correctly
- ✅ Sponsored checkbox checked
- ✅ Sponsor fields filled
- ✅ Can modify and save

**Status:** [ ] Pass [ ] Fail

---

## Firebase Read Testing

### Test Suite 7: Read Efficiency

#### Test 7.1: Initial App Load
**Steps:**
1. Clear browser cache and localStorage
2. Reload page
3. Monitor Network tab (filter: firestore)
4. Count read operations

**Expected Results:**
- ✅ Reads = number of calendar items
- ✅ No extra reads for sponsored functionality
- ✅ Data cached in localStorage

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___

---

#### Test 7.2: Open Sponsored View (First Time)
**Steps:**
1. App loaded with cache
2. Open DevTools Network tab
3. Filter: firestore
4. Click "SPONSORED" button
5. Count new Firebase operations

**Expected Results:**
- ✅ 0 Firebase reads
- ✅ Data filtered from cache
- ✅ View renders instantly

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___

---

#### Test 7.3: Add Obligation
**Steps:**
1. Monitor Network tab
2. Add new obligation
3. Count operations

**Expected Results:**
- ✅ 1 Firebase write (updateDoc)
- ✅ 0 Firebase reads
- ✅ UI updates immediately (optimistic)

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___ | **Write Count:** ___

---

#### Test 7.4: Add Post Link
**Steps:**
1. Monitor Network tab
2. Add post URL
3. Count operations

**Expected Results:**
- ✅ 1 Firebase write
- ✅ 0 Firebase reads

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___ | **Write Count:** ___

---

#### Test 7.5: Delete Post Link
**Steps:**
1. Monitor Network tab
2. Delete post URL
3. Count operations

**Expected Results:**
- ✅ 1 Firebase write
- ✅ 0 Firebase reads

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___ | **Write Count:** ___

---

#### Test 7.6: Delete Obligation
**Steps:**
1. Monitor Network tab
2. Delete obligation
3. Count operations

**Expected Results:**
- ✅ 1 Firebase write
- ✅ 0 Firebase reads

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___ | **Write Count:** ___

---

#### Test 7.7: Navigate Between Views
**Steps:**
1. Open Sponsored view
2. Close it
3. Open calendar day modal
4. Close it
5. Open Sponsored view again
6. Monitor Network tab throughout

**Expected Results:**
- ✅ 0 Firebase reads for all view changes
- ✅ All data from cache

**Status:** [ ] Pass [ ] Fail
**Read Count:** ___

---

#### Test 7.8: Full Session Read Count
**Steps:**
1. Start with cleared cache
2. Load app (initial reads)
3. Perform 20 operations:
   - Create 2 sponsored posts
   - Add 3 obligations each
   - Add 15 post links total
   - Delete 5 post links
   - Delete 1 obligation
4. Count total Firebase reads

**Expected Results:**
- ✅ Reads = initial calendar items only
- ✅ No additional reads from sponsored operations
- ✅ Writes = ~26 (2 creates + 6 obligations + 15 adds + 5 deletes + 1 delete)

**Status:** [ ] Pass [ ] Fail
**Total Read Count:** ___ | **Total Write Count:** ___

---

## Mobile Responsiveness Testing

### Test Suite 8: Mobile Layout

#### Test 8.1: Header Button - Mobile
**Device:** iPhone 12 (390px width) or Chrome DevTools mobile emulation

**Steps:**
1. Open app on mobile viewport
2. Check header buttons

**Expected Results:**
- ✅ SPONSORED button shows 💲 icon only (no text)
- ✅ Button size ≥ 44px tap target
- ✅ Clickable without zooming
- ✅ Proper spacing between buttons

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.2: Sponsored View Modal - Mobile
**Device:** iPhone 12 (390px width)

**Steps:**
1. Open Sponsored view on mobile
2. Check modal appearance

**Expected Results:**
- ✅ Modal takes full width
- ✅ Padding reduced (p-4 instead of p-6)
- ✅ Scrolls smoothly
- ✅ No horizontal overflow
- ✅ Close button accessible

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.3: Item Cards - Mobile Stacking
**Device:** iPhone 12 (390px width)

**Steps:**
1. Open Sponsored view
2. Observe item card layout

**Expected Results:**
- ✅ Header info stacks vertically (sponsor name above date)
- ✅ EDIT button below info (not side-by-side)
- ✅ Progress bar full width
- ✅ No text truncation issues

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.4: Add Obligation Form - Mobile
**Device:** iPhone 12 (390px width)

**Steps:**
1. Expand sponsored item
2. Check "Add New Obligation" form

**Expected Results:**
- ✅ Inputs stack vertically
- ✅ Type input full width
- ✅ Quantity input full width (not w-24)
- ✅ ADD button full width
- ✅ Easy to tap all fields

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.5: Post URL Input - Mobile
**Device:** iPhone 12 (390px width)

**Steps:**
1. Find obligation with Add URL input
2. Tap input field
3. Virtual keyboard appears
4. Type/paste URL

**Expected Results:**
- ✅ Input field full width
- ✅ Keyboard doesn't cover ADD button
- ✅ Can scroll if needed
- ✅ URL not truncated after entry
- ✅ Easy to tap ADD button

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.6: Touch Targets - All Interactive Elements
**Device:** iPhone 12 (390px width)

**Steps:**
1. Use finger (or DevTools touch emulation)
2. Try tapping all buttons:
   - SPONSORED header button
   - EXPAND DETAILS
   - EDIT button
   - Add obligation ADD button
   - Add post URL ADD button
   - Delete icons (🗑️)

**Expected Results:**
- ✅ All buttons ≥ 44x44px
- ✅ No accidental taps on adjacent buttons
- ✅ Clear visual feedback on tap
- ✅ No need to zoom

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.7: Landscape Orientation - Tablet
**Device:** iPad (768px width)

**Steps:**
1. Open app on tablet
2. Rotate to landscape
3. Open Sponsored view

**Expected Results:**
- ✅ Layout adapts (sm:flex-row active)
- ✅ Uses available width efficiently
- ✅ Buttons show text labels
- ✅ Two-column layout where appropriate

**Status:** [ ] Pass [ ] Fail

---

#### Test 8.8: Add/Edit Modal - Mobile
**Device:** iPhone 12 (390px width)

**Steps:**
1. Click ADD ITEM
2. Scroll to Sponsored section
3. Check sponsored checkbox
4. Fill sponsor fields

**Expected Results:**
- ✅ Modal full-screen on mobile
- ✅ Checkbox large enough to tap
- ✅ Input fields full width
- ✅ Can scroll smoothly through all fields
- ✅ Save button accessible

**Status:** [ ] Pass [ ] Fail

---

## Edge Cases & Error Handling

### Test Suite 9: Edge Cases

#### Test 9.1: Empty URL Submission
**Steps:**
1. Find Add Post URL input
2. Leave blank
3. Click ADD button

**Expected Results:**
- ✅ Alert: "Please enter a valid URL"
- ✅ Post NOT added
- ✅ No Firebase write
- ✅ Input field still empty

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.2: Invalid URL Format
**Steps:**
1. Enter URL: "not-a-valid-url"
2. Press Enter

**Expected Results:**
- ✅ Validation message or alert
- ✅ Post NOT added
- ✅ Alternative: Browser native URL validation

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.3: Whitespace-Only URL
**Steps:**
1. Enter URL: "   " (spaces only)
2. Click ADD

**Expected Results:**
- ✅ Alert: "Please enter a valid URL"
- ✅ Post NOT added
- ✅ Input cleared or error shown

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.4: Duplicate Post URLs
**Steps:**
1. Add URL: `https://instagram.com/reel/test123`
2. Add same URL again

**Expected Results:**
- ✅ Both URLs added (duplicates allowed - might be intentional)
- **OR**
- ✅ Warning shown: "URL already added"
- **Note:** Verify expected behavior with product owner

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.5: Very Long URL
**Steps:**
1. Add URL with 500+ characters
2. Check display

**Expected Results:**
- ✅ URL added successfully
- ✅ Display truncates with ellipsis (truncate class)
- ✅ Full URL visible on hover or click
- ✅ No layout breaking

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.6: Special Characters in Obligation Type
**Steps:**
1. Add obligation type: "reel-v2"
2. Add obligation type: "story_highlight"
3. Add obligation type: "REEL" (uppercase)

**Expected Results:**
- ✅ All types accepted
- ✅ Types stored as entered (or lowercased)
- ✅ No errors
- ✅ Display correctly

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.7: Zero or Negative Quantity
**Steps:**
1. Try obligation quantity: 0
2. Try obligation quantity: -5

**Expected Results:**
- ✅ Validation prevents negative numbers
- ✅ Minimum value: 1 (min="1" attribute)
- ✅ Browser prevents invalid entry

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.8: Very Large Quantity
**Steps:**
1. Add obligation quantity: 9999

**Expected Results:**
- ✅ Accepted
- ✅ Progress bar displays correctly (0/9999)
- ✅ No UI overflow
- ✅ Progress calculation accurate

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.9: Delete Last Post in Completed Obligation
**Steps:**
1. Obligation: 3/3 completed (100%)
2. Delete one post → 2/3

**Expected Results:**
- ✅ Progress drops to 67% (cyan)
- ✅ "Add post URL" input reappears
- ✅ Green bar changes to cyan

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.10: Network Failure During Save
**Steps:**
1. Open DevTools Network tab
2. Enable offline mode
3. Try adding obligation or post
4. Observe error handling

**Expected Results:**
- ✅ Error message shown
- ✅ UI reverts to previous state (optimistic update rollback)
- ✅ No partial data saved
- ✅ User notified to try again

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.11: Rapidly Adding Multiple Posts
**Steps:**
1. Add 10 post URLs in rapid succession (< 5 seconds)
2. Check all are saved

**Expected Results:**
- ✅ All 10 posts added
- ✅ No race conditions
- ✅ Correct count (10/X)
- ✅ All posts in Firebase

**Status:** [ ] Pass [ ] Fail

---

#### Test 9.12: Expand/Collapse Multiple Items
**Steps:**
1. Sponsored view with 5+ items
2. Expand item #1
3. Expand item #2
4. Check item #1

**Expected Results:**
- ✅ Item #1 auto-collapses when #2 expands
- **OR**
- ✅ Both stay expanded (verify expected behavior)
- ✅ No performance issues
- ✅ State managed correctly

**Status:** [ ] Pass [ ] Fail

---

### Test Suite 10: Browser Compatibility

#### Test 10.1: Chrome (Latest)
**Browser:** Chrome 120+

**Expected Results:**
- ✅ All features work
- ✅ No console errors
- ✅ Visual indicators display correctly

**Status:** [ ] Pass [ ] Fail

---

#### Test 10.2: Firefox (Latest)
**Browser:** Firefox 120+

**Expected Results:**
- ✅ All features work
- ✅ Drag-and-drop works
- ✅ Icons render properly

**Status:** [ ] Pass [ ] Fail

---

#### Test 10.3: Safari (Latest)
**Browser:** Safari 17+

**Expected Results:**
- ✅ All features work
- ✅ Date inputs work
- ✅ Fetch/cache work

**Status:** [ ] Pass [ ] Fail

---

#### Test 10.4: Mobile Safari (iOS)
**Device:** iPhone 13+ (iOS 16+)

**Expected Results:**
- ✅ Touch interactions smooth
- ✅ Virtual keyboard doesn't break layout
- ✅ Scrolling works properly

**Status:** [ ] Pass [ ] Fail

---

#### Test 10.5: Mobile Chrome (Android)
**Device:** Android 12+

**Expected Results:**
- ✅ All touch targets work
- ✅ No layout issues
- ✅ Back button works

**Status:** [ ] Pass [ ] Fail

---

## Performance Testing

### Test Suite 11: Performance

#### Test 11.1: Large Dataset Performance
**Setup:** Create 50 sponsored items with 5 obligations each

**Steps:**
1. Open Sponsored view
2. Measure load time
3. Expand/collapse items
4. Scroll through list

**Expected Results:**
- ✅ View loads in < 1 second
- ✅ Smooth scrolling (60 FPS)
- ✅ Expand/collapse < 200ms
- ✅ No lag or jank

**Status:** [ ] Pass [ ] Fail
**Load Time:** ___ ms

---

#### Test 11.2: Progress Calculation Performance
**Setup:** Item with 10 obligations, 100 total posts

**Steps:**
1. Add 100th post
2. Measure progress recalculation time
3. Check overall progress updates

**Expected Results:**
- ✅ Calculation instant (< 50ms)
- ✅ UI updates smoothly
- ✅ No blocking or freezing

**Status:** [ ] Pass [ ] Fail
**Calculation Time:** ___ ms

---

#### Test 11.3: Memory Usage
**Steps:**
1. Open DevTools Memory tab
2. Take heap snapshot (initial)
3. Open Sponsored view 10 times
4. Take heap snapshot (final)
5. Compare memory growth

**Expected Results:**
- ✅ Memory growth < 10MB
- ✅ No memory leaks detected
- ✅ Garbage collection working

**Status:** [ ] Pass [ ] Fail
**Memory Growth:** ___ MB

---

## Acceptance Criteria

### ✅ Feature Complete Checklist

- [ ] SPONSORED button visible in header
- [ ] Sponsored view filters items with isSponsored=true
- [ ] Zero additional Firebase reads confirmed
- [ ] Obligations can be added/deleted
- [ ] Progress bars display correctly with color coding
- [ ] Post URLs can be added/deleted
- [ ] Overall progress calculates accurately
- [ ] Calendar views show $ icon and cyan border
- [ ] Mobile layout responsive on phones/tablets
- [ ] Touch targets ≥ 44px on mobile
- [ ] Add/edit modal includes sponsored fields
- [ ] Optimistic updates work (instant UI)
- [ ] localStorage caching functional
- [ ] No console errors in normal usage
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works on iOS and Android

### 🎯 Performance Criteria

- [ ] Sponsored view opens in < 1 second
- [ ] Progress calculations < 50ms
- [ ] UI responsive (60 FPS scrolling)
- [ ] No memory leaks
- [ ] Total Firebase reads = calendar items only

### 📱 Mobile Criteria

- [ ] All buttons ≥ 44x44px
- [ ] No horizontal scrolling issues
- [ ] Virtual keyboard doesn't break layout
- [ ] Touch interactions smooth
- [ ] Text readable without zooming

---

## Test Results Summary

**Date:** _______________
**Tester:** _______________
**Browser:** _______________
**Device:** _______________

**Total Tests:** 100+
**Passed:** ___
**Failed:** ___
**Blocked:** ___
**Pass Rate:** ____%

### Critical Issues Found:
1. ___________________________
2. ___________________________
3. ___________________________

### Minor Issues Found:
1. ___________________________
2. ___________________________
3. ___________________________

### Recommendations:
- ___________________________
- ___________________________
- ___________________________

---

**Sign-off:**

- [ ] All critical tests passed
- [ ] All Firebase read tests passed (0 additional reads confirmed)
- [ ] All mobile responsive tests passed
- [ ] No blocking issues found
- [ ] Feature ready for production

**Approved by:** _______________ **Date:** _______________

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-04
