# VidSum — YouTube Playlist Duration Analyzer

A modern full-stack web application that analyzes YouTube playlists and provides detailed duration insights, playback speed calculations, and watch-time planning.

VidSum features a secure Node.js backend proxy to query the YouTube Data API v3 safely without exposing credentials to the client.

---

## Features

- **No Key Required**: Analyze playlists immediately using the server's default YouTube API key.
- **Custom API Key (Advanced)**: Advanced settings allow users to paste and use their own YouTube API key (saved securely in local browser storage).
- **Comprehensive Analytics**:
  - Calculate total playlist duration instantly.
  - View duration at different playback speeds (1x, 1.25x, 1.5x, 1.75x, 2x).
  - Estimate completion time based on customizable daily watch hours.
- **Custom Backend URL**: Connect a separate frontend (e.g. hosted on Vercel) to your custom backend proxy.
- **Performance Optimizations**:
  - Cache playlist results for 1 hour on the server to prevent redundant API queries.
  - Fetch video durations in parallel batches of 50 for rapid response times.
- **Playlist Management**: Search, filter, and sort videos. Export data to Plain Text, Markdown, or CSV.
- **Responsive Premium UI**: Glassmorphic dark/light design system with smooth micro-animations.

---

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6)
- **Backend**: Node.js, Express
- **API Clients**: Axios
- **Performance**: In-memory caching via `node-cache`
- **Security**: CORS protection, `express-rate-limit`

---

## Project Structure

```text
VidSum/
├── server.js              # Node.js + Express backend proxy & static host
├── index.html             # Premium frontend user interface
├── package.json           # Dependencies and scripts configuration
├── .env                   # Environment variables (private credentials)
├── .env.example           # Environment variables template
├── .gitignore             # Config to ignore node_modules and .env
├── README.md              # Project documentation
├── migration_guide.md     # Steps to transition from frontend-only version
├── deployment_guide.md    # Production deployment instructions (Render, Railway, VPS, Vercel)
└── security_recommendations.md # Security configuration details
```

---

## Getting Started

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd VidSum
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy the template and add your YouTube Data API v3 Key:
```bash
cp .env.example .env
```
Edit the `.env` file and set `YOUTUBE_API_KEY=your_key_here`.

### 4. Start the Application
```bash
npm start
```
Open your browser and navigate to [http://localhost:5000](http://localhost:5000).

---

## Guides & Documentation

- [Migration Guide](file:///Users/aashishkumaranu/Documents/CODING%20WITH%20AI/VidSum--YouTube-Playlist-Duration-Analyzer-/migration_guide.md) — Detailed steps to migrate.
- [Deployment Guide](file:///Users/aashishkumaranu/Documents/CODING%20WITH%20AI/VidSum--YouTube-Playlist-Duration-Analyzer-/deployment_guide.md) — Deploy to Render, Railway, Vercel, and VPS.
- [Security Recommendations](file:///Users/aashishkumaranu/Documents/CODING%20WITH%20AI/VidSum--YouTube-Playlist-Duration-Analyzer-/security_recommendations.md) — Production security configurations.

---

## License

This project is licensed under the MIT License.
