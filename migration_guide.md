# VidSum Migration Guide

This document details the migration steps to update your existing VidSum project into the new secure full-stack Node.js + Express backend proxy architecture.

---

## What Changed?

1. **Proxy Endpoint (`server.js`)**: All API calls to YouTube have been migrated from the client code to the backend Node.js server.
2. **Removed Client Key Requirement**: The app now works out of the box using the server's API key. Users do not need to enter their own key unless they want to.
3. **Advanced Settings Drawer**: The API Key setup panel is now the **Advanced Settings** panel. It handles:
   - Entering/removing a Custom API Key (saved in `localStorage`).
   - Entering/removing a Custom Backend Proxy URL (saved in `localStorage`).
   - Clearly displaying the active API Key Mode: **Server API Key** or **Custom API Key**.
4. **Caching & Parallelization**: The server caches results for 1 hour by default to save YouTube API quotas and executes video duration requests in parallel batches of 50 for rapid response times.

---

## Migration Steps

Follow these steps to run the updated full-stack app locally:

### Step 1: Install Dependencies
Open your terminal in the VidSum directory and install the required NPM modules:
```bash
npm install
```
This installs:
- `express` & `cors` (Server & cross-origin policies)
- `axios` (Performing parallel HTTP requests to YouTube)
- `dotenv` (Loading local variables from `.env`)
- `express-rate-limit` (Spam/abuse mitigation)
- `node-cache` (In-memory playlist result caching)

### Step 2: Configure your Environment
1. In the root directory, open the `.env` file (copied from `.env.example`).
2. Add your YouTube Data API v3 key:
   ```env
   YOUTUBE_API_KEY=AIzaSy...your_actual_key...
   ```

### Step 3: Run the Server
Start the development server:
```bash
npm run dev
```
You will see output similar to:
```text
===================================================
VidSum Backend is running on http://localhost:5000
CORS is enabled for: http://localhost:5000, http://127.0.0.1:5500, http://localhost:3000
Rate Limiting: 100 reqs per 15 mins
Cache TTL: 3600 seconds
===================================================
```

### Step 4: Open VidSum
Open your browser and navigate to:
[http://localhost:5000](http://localhost:5000)

Your frontend is served statically by the Node server. You can analyze any YouTube playlist directly!
- **Default Mode**: You are using **Server API Key** (indicated by the cyan dot in the header).
- **Custom Mode**: Open **Advanced Settings**, paste your own YouTube API Key, and save. The dot will turn green, indicating you are using your **Custom API Key**!
- **Reset**: Click **Remove Key** inside Advanced Settings to revert to the Server API Key mode.
