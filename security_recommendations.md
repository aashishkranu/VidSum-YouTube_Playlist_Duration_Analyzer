# VidSum Security Recommendations

This document outlines the security measures implemented in the full-stack version of VidSum and highlights best practices for maintaining security.

---

## Implemented Security Features

### 1. Private API Key Management (Backend Proxy)
* **Problem**: Storing API keys directly in the frontend code exposes them to anyone viewing the source code, leading to key theft and potential financial costs.
* **Solution**: The YouTube API key is stored on the server using environment variables (`.env`). The server acts as a proxy, executing YouTube Data API queries on behalf of the client. The backend never exposes the server's API key to the client.

### 2. CORS (Cross-Origin Resource Sharing) Protection
* **Problem**: Unrestricted API access allows third-party websites to abuse your backend proxy.
* **Solution**: The backend implements the `cors` package. In production, you configure the `CORS_ORIGIN` environment variable with your specific frontend domain. The server will reject API requests from unauthorized origins.

### 3. Rate Limiting
* **Problem**: Malicious bots or users could spam your API, exhausting the daily YouTube API quota (10,000 units per day) and bringing down your app.
* **Solution**: Built-in rate limiting via `express-rate-limit` limits the number of requests a single IP can make within a 15-minute window (default: 100 requests per 15 minutes).

### 4. Client API Key Security
* **Problem**: Allowing custom API keys could lead to security risks if they are logged or shared.
* **Solution**:
  - The custom API key is stored strictly in the user's browser via `localStorage` (`yt_playlist_duration_key`).
  - It is sent to the backend only via a secure HTTPS header (`X-Custom-API-Key`).
  - The backend uses this key directly for that single request cycle and does NOT store it on the server disk, database, or cache.
  - It is never shared with any other users.

### 5. Input Sanitization & URL Validation
* **Problem**: Malicious inputs could trigger unexpected API behaviors or exploits.
* **Solution**: The backend parses the playlist URL/ID using a robust, clean URL parser. It isolates the exact alphanumeric playlist ID structure before querying the YouTube API.

---

## Recommendations for Production Deployments

### 1. Enable HTTPS
* Always enforce SSL/HTTPS on both the frontend and backend.
* If deploying separately (e.g. Vercel + Render), Vercel enforces HTTPS by default, and Render provides free SSL certificates for web services.
* If deploying on a VPS, configure Nginx with **Let's Encrypt** (using `certbot`) to handle SSL.

### 2. Lock Down YouTube API Key Restrictions (Google Cloud Console)
In the [Google Cloud Console](https://console.cloud.google.com/):
1. Go to **APIs & Services** > **Credentials**.
2. Select your YouTube API Key.
3. Under **Key Restrictions**, select **API restrictions**:
   - Limit the key to only call **YouTube Data API v3**.
4. (Optional) Under **Application restrictions**, select **IP addresses (web servers)**:
   - Enter your backend server's public IP address. This ensures that even if your backend API key is somehow leaked, Google will reject requests from any other server!

### 3. Keep CORS Origins Strict
* Avoid using `CORS_ORIGIN=*` in production.
* Set it explicitly to your frontend domain:
  ```env
  CORS_ORIGIN=https://vidsum.yourdomain.com
  ```

### 4. Monitor YouTube Quotas
* The YouTube Data API has a default daily quota limit of 10,000 units.
* Monitor your quota usage in the Google Cloud Console to detect unusual traffic peaks.
* Because the server caches successful playlist queries for 1 hour, repeat hits on popular playlists do not consume any YouTube API quota!
