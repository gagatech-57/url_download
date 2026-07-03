const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://gunaknn_db_user:gunasekarviji@cluster0.ioiwshu.mongodb.net/swiftmarket?retryWrites=true&w=majority';

// Connect to MongoDB Atlas (reused in serverless function)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas (swiftmarket db)'))
    .catch(err => console.error('MongoDB connection failure:', err));
}

// Schema for user profile registrations (url_users collection)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatar: { type: String },
  lastLogin: { type: Date, default: Date.now }
}, { collection: 'url_users' });

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

// Schema for tracking file downloads (url_downloads collection)
const DownloadLogSchema = new mongoose.Schema({
  email: { type: String, default: 'guest' },
  url: { type: String, required: true },
  filename: { type: String, required: true },
  format: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String }
}, { collection: 'url_downloads' });

const DownloadLogModel = mongoose.models.DownloadLog || mongoose.model('DownloadLog', DownloadLogSchema);

const app = express();
app.use(cors());
app.use(express.json());

// Cache for cobalt working APIs
let apiCache = {
  lastUpdated: 0,
  data: null,
  allApis: []
};

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

// Fetch working APIs from cobalt.directory
async function fetchWorkingApis() {
  const now = Date.now();
  if (apiCache.data && (now - apiCache.lastUpdated < CACHE_DURATION)) {
    return apiCache;
  }

  console.log('Fetching working Cobalt API instances from tracker...');
  try {
    const response = await axios.get('https://cobalt.directory/api/working?type=api', {
      headers: { 'Accept': 'application/json' },
      timeout: 8000
    });
    
    if (response.data && response.data.data) {
      const data = response.data.data;
      const allApisSet = new Set();
      Object.values(data).forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(url => allApisSet.add(url));
        }
      });

      apiCache = {
        lastUpdated: now,
        data: data,
        allApis: Array.from(allApisSet)
      };
      console.log(`Loaded ${apiCache.allApis.length} unique working Cobalt API instances.`);
      return apiCache;
    }
  } catch (error) {
    console.error('Error fetching working APIs list:', error.message);
    if (apiCache.data) {
      return apiCache;
    }
  }

  const defaultApis = [
    'https://melon.clxxped.lol',
    'https://nuko-c.meowing.de',
    'https://subito-c.meowing.de',
    'https://api.qwkuns.me',
    'https://api.cobalt.blackcat.sweeux.org',
    'https://rue-cobalt.xenon.zone',
    'https://cobalt.omega.wolfy.love',
    'https://cobalt.alpha.wolfy.love'
  ];

  return {
    lastUpdated: 0,
    data: {},
    allApis: defaultApis
  };
}

// Detect service based on URL
function detectService(url) {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowercaseUrl.includes('instagram.com')) {
    return 'instagram';
  }
  if (lowercaseUrl.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) {
    return 'twitter';
  }
  if (lowercaseUrl.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  if (lowercaseUrl.includes('reddit.com')) {
    return 'reddit';
  }
  if (lowercaseUrl.includes('pinterest.com')) {
    return 'pinterest';
  }
  return null;
}

// Sync User Profile (url_users collection)
app.post('/api/user/sync', async (req, res) => {
  const { name, email, avatar } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const user = await UserModel.findOneAndUpdate(
      { email },
      { name, avatar, lastLogin: new Date() },
      { new: true, upsert: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error syncing user profile:', err);
    res.status(500).json({ error: 'Database sync failure' });
  }
});

// Log Download event (url_downloads collection)
app.post('/api/download/log', async (req, res) => {
  const { email, url, filename, format } = req.body;
  if (!url || !filename || !format) {
    return res.status(400).json({ error: 'URL, filename, and format are required' });
  }

  try {
    const log = new DownloadLogModel({
      email: email || 'guest',
      url,
      filename,
      format,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });
    await log.save();
    res.json({ success: true, log });
  } catch (err) {
    console.error('Error logging download:', err);
    res.status(500).json({ error: 'Database write failure' });
  }
});

// API status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const cache = await fetchWorkingApis();
    res.json({
      status: 'online',
      cacheAgeSeconds: Math.floor((Date.now() - cache.lastUpdated) / 1000),
      nodesCount: cache.allApis.length,
      servicesSupported: Object.keys(cache.data)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve backend status' });
  }
});

// Download processor
app.post('/api/download', async (req, res) => {
  const { url, downloadMode, videoQuality, audioFormat, audioBitrate, customApiOverride } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  let targetApis = [];

  if (customApiOverride && customApiOverride.trim()) {
    let cleanOverride = customApiOverride.trim();
    if (!cleanOverride.startsWith('http://') && !cleanOverride.startsWith('https://')) {
      cleanOverride = 'https://' + cleanOverride;
    }
    if (cleanOverride.endsWith('/')) {
      cleanOverride = cleanOverride.slice(0, -1);
    }
    targetApis = [cleanOverride];
  } else {
    const cache = await fetchWorkingApis();
    const service = detectService(url);
    
    if (service && cache.data[service] && cache.data[service].length > 0) {
      const serviceNodes = [...cache.data[service]];
      serviceNodes.sort(() => Math.random() - 0.5);
      const otherNodes = cache.allApis.filter(url => !serviceNodes.includes(url));
      otherNodes.sort(() => Math.random() - 0.5);
      targetApis = [...serviceNodes, ...otherNodes];
    } else {
      targetApis = [...cache.allApis];
      targetApis.sort(() => Math.random() - 0.5);
    }
  }

  const errors = [];
  
  for (let i = 0; i < targetApis.length; i++) {
    const apiNode = targetApis[i];
    try {
      const response = await axios.post(apiNode, {
        url: url,
        audioFormat: audioFormat || 'mp3',
        audioBitrate: audioBitrate || '128',
        videoQuality: videoQuality || '1080',
        downloadMode: downloadMode || 'tunnel',
        filenameStyle: 'basic',
        disableMetadata: false
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data) {
        const data = response.data;
        if (data.status === 'stream' || data.status === 'tunnel' || data.status === 'redirect' || data.status === 'picker') {
          return res.json({
            ...data,
            apiNodeUsed: apiNode
          });
        } else if (data.status === 'error') {
          const errorCode = data.error?.code || 'unknown_error';
          errors.push({ node: apiNode, error: errorCode });
          if (errorCode.includes('invalid') || errorCode.includes('unsupported') || errorCode.includes('url')) {
            return res.status(400).json({
              error: `The media platform returned an error: ${errorCode}. Please check if the URL is correct and public.`
            });
          }
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.code || err.message;
      errors.push({ node: apiNode, error: errMsg });
    }
  }

  res.status(500).json({
    error: 'All available download servers failed to process this request.',
    details: errors
  });
});

// Proxy tunnel endpoint
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  console.log(`Redirecting client directly to media source: ${url}`);
  return res.redirect(url);
});

module.exports = app;
