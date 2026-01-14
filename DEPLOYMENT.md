# Firebase Deployment Guide

## Project Information
- **Firebase Project**: angels-calendar-2026
- **Hosting URL**: https://angels-calendar-2026.web.app
- **Alternative URL**: https://angels-calendar-2026.firebaseapp.com

## Initial Setup (One-time)

1. **Login to Firebase** (required before first deployment)
   ```bash
   npm run firebase:login
   ```
   This will open a browser window for you to authenticate with your Google account.

## Deployment

### Quick Deploy
```bash
npm run deploy
```
This command will:
1. Build the production bundle (`npm run build`)
2. Deploy to Firebase Hosting

### Manual Steps
If you prefer to run each step separately:

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   npx firebase deploy --only hosting
   ```

## Configuration Files

- **firebase.json**: Firebase Hosting configuration
  - Public directory: `dist` (Vite build output)
  - SPA routing: All routes redirect to index.html
  - Caching: JS/CSS cached for 1 year, index.html not cached

- **.firebaserc**: Specifies the Firebase project
  - Default project: `angels-calendar-2026`

## Troubleshooting

### Authentication Error
If you see `Failed to authenticate`:
```bash
npm run firebase:logout
npm run firebase:login
```

### Build Errors
Make sure dependencies are installed:
```bash
npm install
npm run build
```

### View Deployment Status
```bash
npx firebase hosting:channel:list
```

## Firestore Rules

Remember to configure Firestore security rules in the Firebase Console:
- Go to: https://console.firebase.google.com/project/angels-calendar-2026/firestore/rules

## Local Development

Run the app locally:
```bash
npm run dev
```

Preview production build locally:
```bash
npm run build
npm run preview
```

## Environment

- **Node.js**: Ensure you're using Node 18+ for best compatibility
- **Firebase SDK**: v10.14.1
- **Build Tool**: Vite v5.4.2
