# Angels Calendar - Deployment Guide

This application is ready to deploy! You have several options:

## Option 1: Deploy to Vercel (Recommended - Easiest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sherryfirm/angelscalendarupdated)

### Steps:
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `sherryfirm/angelscalendarupdated`
4. Vercel will auto-detect the settings (Vite framework)
5. Click "Deploy"
6. Your site will be live in ~1 minute!

Your live URL will be: `https://angelscalendarupdated.vercel.app` (or a custom domain)

## Option 2: Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/sherryfirm/angelscalendarupdated)

### Steps:
1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select: `sherryfirm/angelscalendarupdated`
4. Netlify will auto-detect the settings from `netlify.toml`
5. Click "Deploy site"
6. Your site will be live in ~1 minute!

Your live URL will be: `https://angelscalendarupdated.netlify.app` (or a custom domain)

## Option 3: Deploy to Firebase Hosting

Since you're already using Firebase for the database, you can also host on Firebase:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting

# When prompted:
# - Select your existing project: angels-calendar-2026
# - Public directory: dist
# - Single-page app: Yes
# - Overwrite index.html: No

# Deploy
firebase deploy --only hosting
```

Your live URL will be: `https://angels-calendar-2026.web.app`

## Build Status

✅ Production build completed successfully
- Build output: `dist/` directory
- Entry point: `dist/index.html`
- Assets: Optimized CSS and JS bundles

## What's Deployed

- 📅 Full Angels 2026 season calendar
- 🏠 All home games now show "Tempe Diablo Field" for spring training (before March 22)
- ⚾ Complete schedule with games, promos, events, and player birthdays
- 🔥 Real-time Firebase database integration
- 📱 Responsive design for all devices

## Environment Variables

No environment variables needed! Firebase config is already in the code.

## Custom Domain (Optional)

After deployment, you can add a custom domain:
- Vercel: Project Settings → Domains
- Netlify: Site Settings → Domain Management
- Firebase: Hosting → Connect custom domain

---

**Need help?** Check the documentation for your chosen platform:
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
