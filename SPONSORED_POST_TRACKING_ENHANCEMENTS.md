# Sponsored Post Tracking - New Features Documentation

## Overview

This document describes the latest enhancements to the Sponsored Post Tracking system, added after the initial release. These features provide more flexibility and efficiency for managing sponsored campaigns.

---

## Table of Contents

1. [Multi-Platform URL Grouping](#multi-platform-url-grouping)
2. [CSV Batch Campaign Import](#csv-batch-campaign-import)
3. [Updated User Workflows](#updated-user-workflows)
4. [Technical Details](#technical-details)

---

## Multi-Platform URL Grouping

### Feature Overview

Posts can now be grouped across multiple platforms (Instagram, TikTok, YouTube, etc.) to count as **ONE obligation fulfillment**. This is perfect for cross-platform campaigns where the same content is shared on multiple social networks.

### Key Benefits

- **Accurate Tracking**: Multiple platform URLs count as one post completion
- **Platform Identification**: Automatic platform detection from URL
- **Flexible Management**: Add/remove individual platform URLs
- **Visual Clarity**: Platform badges show which networks are used

### Supported Platforms

The system automatically detects and labels these platforms:
- **Instagram** (instagram.com)
- **TikTok** (tiktok.com)
- **YouTube** (youtube.com, youtu.be)
- **Facebook** (facebook.com, fb.com)
- **Twitter/X** (twitter.com, x.com)
- **LinkedIn** (linkedin.com)
- **Pinterest** (pinterest.com)
- **Snapchat** (snapchat.com)
- **Other** (any other URL)

### How to Use

#### Creating a Multi-Platform Post

1. **Navigate to Sponsored View**
   - Click **SPONSORED** button in header

2. **Expand Campaign Details**
   - Find your campaign
   - Click **▼ EXPAND DETAILS**

3. **Add First Platform URL**
   - Find the obligation type (e.g., "reel")
   - Paste the URL in "Add a new post" field
   - Click **ADD POST**
   - Post appears with platform badge

4. **Add Additional Platform URLs**
   - Click **+ Platform** button on the post
   - Paste the URL from another platform
   - Click **ADD**
   - New URL appears with its own platform badge

#### Managing Platform URLs

**View Platform Count:**
- Posts with multiple URLs show a badge: "2 platforms", "3 platforms", etc.

**Delete Individual URL:**
- Click the **X** button next to any URL
- Only available when post has 2+ URLs
- Deleting the last URL removes the entire post

**Delete Entire Post:**
- Click the trash icon in post header
- Removes all platform URLs at once

### Example Use Case

You create a reel for Nike and post it on:
1. Instagram Reels: `https://instagram.com/reel/abc123`
2. TikTok: `https://tiktok.com/@user/video/xyz789`
3. YouTube Shorts: `https://youtube.com/shorts/def456`

**Old Behavior**: Would count as 3/4 posts completed (incorrect!)

**New Behavior**: Counts as 1/4 posts completed (correct!) ✅

All three URLs are grouped as one post with "3 platforms" badge.

---

## CSV Batch Campaign Import

### Feature Overview

Import multiple sponsored campaigns at once using a CSV file. Perfect for planning an entire season or year of sponsored content in advance.

### Key Benefits

- **Time Savings**: Create dozens of campaigns in seconds
- **Bulk Planning**: Upload entire sponsorship schedule at once
- **Template Support**: Use provided sample CSV as starting point
- **Preview Before Import**: Review campaigns before committing

### CSV File Format

#### Required Columns

1. **Campaign Name** - Name of the campaign (e.g., "Nike Summer 2026")
2. **Sponsor Name** - Company/brand name (e.g., "Nike")
3. **Sponsor Type** - Campaign type (e.g., "Brand Partnership")

#### Optional Columns (Obligations)

Add obligation types and counts in pairs:
- **Obligation Type 1** - Type name (e.g., "reel")
- **Count 1** - Quantity required (e.g., "4")
- **Obligation Type 2** - Another type (e.g., "story")
- **Count 2** - Quantity (e.g., "6")
- ... and so on

#### Example CSV

```csv
Campaign Name,Sponsor Name,Sponsor Type,Obligation Type 1,Count 1,Obligation Type 2,Count 2,Obligation Type 3,Count 3
Nike Summer 2026,Nike,Brand Partnership,reel,4,story,6,post,8
Coca-Cola Promo,Coca-Cola,Product Placement,post,10,carousel,3
Adidas Fall Campaign,Adidas,Brand Partnership,reel,5,story,10
Sephora Beauty Series,Sephora,Affiliate Partnership,reel,3,post,5,story,8
Amazon Prime Day,Amazon,Sponsored Content,post,12
```

#### CSV Rules

- **First row is skipped** (header row)
- **Commas separate columns**
- **Quotes around values** (optional, but recommended for values with commas)
- **Empty cells are allowed** (will use defaults)
- **Minimum 2 columns required** (Campaign Name, Sponsor Name)

### How to Use

#### Step 1: Prepare CSV File

1. **Option A: Use Sample Template**
   - Find `sample_campaigns.csv` in project root
   - Open in Excel, Google Sheets, or text editor
   - Modify with your campaign data
   - Save as CSV

2. **Option B: Create From Scratch**
   - Create new file in spreadsheet software
   - Add header row (will be skipped)
   - Add campaign data rows
   - Export as CSV

#### Step 2: Import Campaigns

1. **Open Sponsored View**
   - Click **SPONSORED** button in header

2. **Click Import CSV Button**
   - Click **IMPORT CSV** (blue button in header)
   - CSV import modal opens

3. **Upload File**
   - Click "Choose File" button
   - Select your CSV file
   - File is parsed automatically

4. **Review Preview**
   - Preview shows all campaigns found
   - Each campaign displays:
     - Campaign name
     - Sponsor name and type
     - Obligations (if any)
   - Scroll to review all campaigns

5. **Confirm Import**
   - Click **IMPORT X CAMPAIGN(S)** button
   - Campaigns are created in Firebase
   - Success message appears
   - Modal closes automatically

6. **Link Calendar Items** (optional)
   - Create or edit calendar items
   - Select campaign from dropdown
   - Items appear under campaign in Sponsored View

### Error Handling

**No Valid Campaigns Found:**
- Check CSV has at least Campaign Name and Sponsor Name
- Ensure first row is header (will be skipped)
- Verify columns are comma-separated

**Import Failed:**
- Check internet connection
- Verify Firebase permissions
- Try again or contact support

---

## Updated User Workflows

### Workflow 1: Cross-Platform Campaign

**Scenario**: Create a Nike campaign with Instagram + TikTok content

1. **Create Campaign**
   - Open Sponsored View → Click **+ NEW**
   - Enter "Nike Summer 2026" / "Nike" / "Brand Partnership"
   - Click **CREATE CAMPAIGN**

2. **Add Obligation**
   - Expand campaign → "Add New Obligation"
   - Type: "reel", Quantity: "4"
   - Click **ADD**

3. **Create Calendar Item**
   - Calendar → **ADD ITEM**
   - Select date, type, title
   - Sponsored Campaign: "Nike Summer 2026 - Nike"
   - Save

4. **Add Multi-Platform Post**
   - Sponsored View → Expand campaign
   - Under "reel" obligation:
     - Paste Instagram URL → **ADD POST**
     - Click **+ Platform** on new post
     - Paste TikTok URL → **ADD**
   - Progress shows: 1/4 completed (25%)

5. **Repeat** for remaining 3 posts

### Workflow 2: Bulk Import Season Schedule

**Scenario**: Import 10 campaigns for Q2 2026

1. **Prepare CSV**
   - Open `sample_campaigns.csv`
   - Add 10 campaign rows with details
   - Save as `q2_2026_campaigns.csv`

2. **Import**
   - Sponsored View → **IMPORT CSV**
   - Upload `q2_2026_campaigns.csv`
   - Review 10 campaigns in preview
   - Click **IMPORT 10 CAMPAIGN(S)**

3. **Link Calendar Items**
   - Create calendar items as scheduled
   - Select campaign from dropdown for each
   - Track progress in Sponsored View

---

## Technical Details

### Data Structure Changes

#### Post Object (New)

```javascript
{
  id: "post_1234567890_abc123",        // Unique post ID
  urls: [                               // Array of platform URLs
    {
      platform: "Instagram",            // Auto-detected platform
      url: "https://instagram.com/...", // Full URL
      dateAdded: "2026-04-10T10:00:00Z" // ISO timestamp
    },
    {
      platform: "TikTok",
      url: "https://tiktok.com/@user/video/...",
      dateAdded: "2026-04-10T10:15:00Z"
    }
  ],
  dateCompleted: "2026-04-10T10:00:00Z" // When first URL added
}
```

#### Post Object (Old - Backward Compatible)

```javascript
{
  url: "https://instagram.com/...",     // Single URL
  dateAdded: "2026-04-10T10:00:00Z"     // ISO timestamp
}
```

**Note**: Old posts are automatically converted to new format when displayed.

### New Functions

#### Platform Detection

```javascript
const detectPlatform = (url) => {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('instagram.com')) return 'Instagram';
  if (urlLower.includes('tiktok.com')) return 'TikTok';
  // ... other platforms
  return 'Other';
};
```

#### Add URL to Post Group

```javascript
const handleAddUrlToPost = async (campaignId, obligationType, postIndex, postUrl) => {
  // Validates URL
  // Detects platform
  // Adds to post.urls array
  // Updates Firebase and local state
};
```

#### Delete Individual URL

```javascript
const handleDeleteUrl = async (campaignId, obligationType, postIndex, urlIndex) => {
  // Removes URL from post.urls array
  // If last URL, deletes entire post
  // Updates Firebase and local state
};
```

#### CSV Parsing

```javascript
const handleCsvFileUpload = (event) => {
  // Reads CSV file
  // Parses rows (skips header)
  // Extracts campaign data and obligations
  // Validates and previews
  // Sets csvPreview state
};
```

#### Batch Import

```javascript
const handleImportCampaigns = async () => {
  // Creates Firebase batch
  // Adds all campaigns from preview
  // Commits batch (single write operation)
  // Updates local state
  // Shows success message
};
```

### Firebase Optimization

**Batch Writes**: CSV import uses `writeBatch()` to create multiple campaigns in a single operation, minimizing Firebase writes.

**Platform Detection**: Happens client-side before writing to Firebase, no additional reads required.

**Backward Compatibility**: Old single-URL posts work seamlessly with new multi-URL system.

---

## Best Practices

### Multi-Platform Posts

✅ **DO:**
- Group URLs for the same content across platforms
- Use "+ Platform" for cross-posted content
- Delete individual URLs if one platform version is removed

❌ **DON'T:**
- Group unrelated posts together
- Create separate posts for same content on different platforms

### CSV Import

✅ **DO:**
- Use sample CSV as template
- Preview campaigns before importing
- Keep CSV simple (avoid complex formatting)
- Test with small file first

❌ **DON'T:**
- Use commas in campaign names without quotes
- Skip required columns (Campaign Name, Sponsor Name)
- Import same CSV twice (creates duplicates)

---

## Troubleshooting

### Multi-Platform Issues

**Problem**: Platform shows as "Other" instead of "Instagram"

**Solution**: Ensure URL is complete and properly formatted (e.g., `https://instagram.com/...`)

---

**Problem**: Can't delete individual URL

**Solution**: Delete button only appears when post has 2+ URLs. For single-URL posts, delete entire post.

---

### CSV Import Issues

**Problem**: "No valid campaigns found in CSV"

**Solution**:
- Check CSV has Campaign Name and Sponsor Name columns
- Ensure values aren't empty
- Verify file is actually CSV format (not Excel .xlsx)

---

**Problem**: Campaigns imported but obligations missing

**Solution**:
- Check obligation type and count are in pairs
- Ensure counts are valid numbers
- Verify columns are properly separated by commas

---

## Future Enhancements

Potential additions to the system:

- **Analytics Dashboard**: Track completion rates across campaigns
- **Date Ranges**: Set campaign start/end dates
- **Budget Tracking**: Add cost/payment tracking
- **Export Reports**: Generate CSV reports of completed campaigns
- **Platform-Specific Metrics**: Track engagement by platform

---

## Support

For questions or issues:
1. Check [Main Documentation](./SPONSORED_POST_TRACKING.md)
2. Review [Test Plan](./SPONSORED_POST_TRACKING_TEST_PLAN.md)
3. Examine sample CSV: `sample_campaigns.csv`

---

**Last Updated**: December 5, 2025
**Version**: 2.0 (Multi-Platform + CSV Import)
