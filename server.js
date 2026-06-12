const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Trust Proxy to allow rate limiting to work behind reverse proxies
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
} else {
  app.set('trust proxy', 1);
}

// Initialize Cache (1 hour default TTL, checks for expired cache every 10 minutes)
const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
const playlistCache = new NodeCache({ stdTTL: cacheTTL, checkperiod: 600 });

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
  : ['http://localhost:5000', 'http://127.0.0.1:5500', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.CORS_ORIGIN === '*' || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Custom-API-Key', 'X-API-Key'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Basic Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate Limiting
const limiterWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 mins
const limiterMax = parseInt(process.env.RATE_LIMIT_MAX) || 100;

const apiLimiter = rateLimit({
  windowMs: limiterWindowMs,
  max: limiterMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Apply rate limiter to API routes only
app.use('/api/', apiLimiter);

// Serve frontend files statically from the root directory
app.use(express.static(path.join(__dirname)));

// ISO 8601 Durations to Seconds Converter (PT1H2M10S -> 3730)
function parseISO8601Duration(durationStr) {
  if (!durationStr) return 0;
  // Matches days (D), hours (H), minutes (M), and seconds (S)
  const regex = /^P(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/;
  const matches = durationStr.match(regex);
  if (!matches) return 0;
  
  const days = parseInt(matches[1] || 0, 10);
  const hours = parseInt(matches[2] || 0, 10);
  const minutes = parseInt(matches[3] || 0, 10);
  const seconds = parseInt(matches[4] || 0, 10);
  
  return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
}

// Helper: Extract YouTube Playlist ID
function parsePlaylistId(input) {
  if (!input) return null;
  input = input.trim();
  
  let playlistId = null;
  
  // If it's directly a playlist ID (usually starts with PL, UU, FL, etc., length 18 to 56)
  if (/^[A-Za-z0-9_-]{18,56}$/.test(input)) {
    playlistId = input;
  } else {
    try {
      const url = new URL(input);
      let listId = url.searchParams.get('list');
      if (listId) {
        playlistId = listId;
      } else {
        const pathSegments = url.pathname.split('/');
        for (let i = 0; i < pathSegments.length; i++) {
          if (pathSegments[i] === 'playlist' && pathSegments[i+1]) {
            playlistId = pathSegments[i+1];
            break;
          }
        }
      }
    } catch (e) {
      const match = input.match(/[?&]list=([^#\&\?]+)/);
      if (match && match[1]) {
        playlistId = match[1];
      }
    }
  }
  
  // Strictly validate the extracted playlistId to prevent injection
  if (playlistId && /^[A-Za-z0-9_-]{18,56}$/.test(playlistId)) {
    return playlistId;
  }
  
  return null;
}

// API Endpoint: Analyze Playlist
app.get('/api/playlist', async (req, res) => {
  const urlParam = req.query.url;
  
  if (!urlParam) {
    return res.status(400).json({ error: 'Playlist URL or ID is required.' });
  }

  const playlistId = parsePlaylistId(urlParam);
  if (!playlistId) {
    return res.status(400).json({ error: 'Invalid YouTube playlist URL or ID format.' });
  }

  // Determine API Key to use:
  // 1. Check custom headers
  // 2. Check query parameter
  // 3. Fallback to server's env key
  const customApiKey = req.headers['x-custom-api-key'] || req.headers['x-api-key'] || req.query.customApiKey;
  const isCustomKey = !!customApiKey;
  const apiKey = customApiKey || process.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    return res.status(400).json({ 
      error: 'YouTube API Key is missing. Please provide a custom API key in Advanced Settings or check the server configuration.' 
    });
  }

  // Cache lookups are keyed by playlistId + isCustomKey flag.
  // We hash the custom API key if present to prevent cross-user data leakage.
  let cacheKey;
  if (isCustomKey) {
    const keyHash = crypto.createHash('sha256').update(customApiKey).digest('hex').substring(0, 16);
    cacheKey = `${playlistId}_custom_${keyHash}`;
  } else {
    cacheKey = `${playlistId}_server`;
  }
  
  // Only use cache if it is not a direct force refresh request
  const forceRefresh = req.query.refresh === 'true';
  if (!forceRefresh) {
    const cachedData = playlistCache.get(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, _cached: true });
    }
  }

  try {
    let playlistTitle = 'YouTube Playlist';
    let playlistThumbnail = '';
    
    // Step 1: Retrieve Playlist general snippet information
    try {
      const playlistDetailsRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlists`,
        {
          params: {
            part: 'snippet',
            id: playlistId,
            key: apiKey
          }
        }
      );
      
      if (playlistDetailsRes.data.items && playlistDetailsRes.data.items.length > 0) {
        const snippet = playlistDetailsRes.data.items[0].snippet;
        playlistTitle = snippet.title;
        playlistThumbnail = snippet.thumbnails?.medium?.url 
          || snippet.thumbnails?.default?.url 
          || snippet.thumbnails?.high?.url 
          || '';
      }
    } catch (err) {
      console.warn(`Could not fetch playlist snippet for ${playlistId}, falling back to defaults.`, err.message);
      // If the playlist is private or details aren't accessible, we might still be able to fetch items if they have direct access,
      // but usually this indicates a invalid/private playlist or bad API key. Let's let the next block catch the error if it's completely inaccessible.
    }

    // Step 2: Page through playlistItems (max 50 per page)
    let allItems = [];
    let nextPageToken = '';
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlistItems`,
        {
          params: {
            part: 'snippet,contentDetails',
            playlistId: playlistId,
            maxResults: 50,
            pageToken: nextPageToken,
            key: apiKey
          }
        }
      );

      const data = response.data;
      if (!data.items || data.items.length === 0) {
        break;
      }

      const pageItems = data.items.map(item => ({
        id: item.contentDetails?.videoId,
        title: item.snippet?.title || 'Unknown Title',
        thumbnail: item.snippet?.thumbnails?.medium?.url 
          || item.snippet?.thumbnails?.default?.url 
          || 'https://via.placeholder.com/320x180?text=No+Thumbnail',
        position: item.snippet?.position || 0,
        duration: 0 // Will populate in the next API step
      })).filter(item => item.id); // Filter out items without a videoId (e.g. deleted videos)

      allItems = allItems.concat(pageItems);
      nextPageToken = data.nextPageToken || '';
      hasNextPage = !!nextPageToken;

      // Safety limit to prevent infinite loops and excessive resource usage
      if (allItems.length >= 1000) {
        break;
      }
    }

    if (allItems.length === 0) {
      return res.status(404).json({ error: 'This playlist contains no accessible videos, is private, or does not exist.' });
    }

    // Step 3: Fetch exact durations for all videos in parallel batches of 50
    const batchSize = 50;
    const batchPromises = [];
    
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      const videoIds = batch.map(item => item.id).join(',');

      batchPromises.push(
        axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
          params: {
            part: 'contentDetails',
            id: videoIds,
            key: apiKey
          }
        }).then(videoResponse => {
          const videoData = videoResponse.data;
          const durationMap = {};
          
          if (videoData.items) {
            videoData.items.forEach(v => {
              durationMap[v.id] = parseISO8601Duration(v.contentDetails?.duration);
            });
          }

          // Apply durations back to the matching items in the batch
          batch.forEach(item => {
            item.duration = durationMap[item.id] || 0;
          });
        }).catch(err => {
          console.error(`Failed to fetch video durations for batch of ids starting with ${batch[0]?.id}:`, err.message);
          // Let durations remain 0 rather than failing the entire playlist load
        })
      );
    }

    // Wait for all parallel batches to complete
    await Promise.all(batchPromises);

    // Calculate metadata
    const totalDuration = allItems.reduce((sum, v) => sum + v.duration, 0);
    const videoCount = allItems.length;
    
    // Fallback thumbnail if playlist main thumbnail is empty
    if (!playlistThumbnail && allItems.length > 0) {
      playlistThumbnail = allItems[0].thumbnail;
    }

    const result = {
      title: playlistTitle,
      thumbnail: playlistThumbnail,
      videoCount,
      totalDuration,
      playbackSpeedDurations: {
        '1x': totalDuration,
        '1.25x': Math.round(totalDuration / 1.25),
        '1.5x': Math.round(totalDuration / 1.5),
        '1.75x': Math.round(totalDuration / 1.75),
        '2x': Math.round(totalDuration / 2.0)
      },
      videos: allItems
    };

    // Cache the successful result
    playlistCache.set(cacheKey, result);

    return res.json(result);
  } catch (err) {
    console.error('YouTube API Fetch Error:', err.response?.data || err.message);
    
    // Extract user-friendly error message from YouTube response if available
    const status = err.response?.status || 500;
    const ytError = err.response?.data?.error?.message || 'Error occurred while communicating with YouTube API.';
    
    return res.status(status).json({ error: ytError });
  }
});

// Fallback: Redirect all other requests to index.html (useful for Single Page App routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`VidSum Backend is running on http://localhost:${PORT}`);
  console.log(`CORS is enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`Rate Limiting: ${limiterMax} reqs per ${limiterWindowMs / 60000} mins`);
  console.log(`Cache TTL: ${cacheTTL} seconds`);
  console.log(`===================================================`);
});
