// api/admin.js
const crypto = require('crypto');

// In-memory storage (akan direset setiap deploy)
// Untuk production, gunakan database seperti MongoDB atau PostgreSQL
let keyDatabase = {
  keys: [],
  usageLogs: [],
  settings: {
    adminPassword: "Whoamidev1819",
    maxKeysPerHWID: 1
  }
};

// Helper function untuk generate random key
function generateKey(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function untuk hash HWID
function hashHWID(hwid) {
  return crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
}

// CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { password, action } = req.query;
  
  // Validasi admin password
  if (password !== keyDatabase.settings.adminPassword) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid admin password' 
    });
  }

  try {
    switch (action) {
      case 'generateKey':
        return handleGenerateKey(req, res);
      case 'deleteKey':
        return handleDeleteKey(req, res);
      case 'resetKey':
        return handleResetKey(req, res);
      case 'getUsageLogs':
        return handleGetUsageLogs(req, res);
      case 'getStats':
        return handleGetStats(req, res);
      default:
        return handleGetAllKeys(req, res);
    }
  } catch (error) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}

// Get all keys with status
function handleGetAllKeys(req, res) {
  const keysWithStatus = keyDatabase.keys.map(keyData => ({
    ...keyData,
    isUsed: keyData.hwid !== null,
    lastUsed: keyData.lastUsedAt || null,
    usageCount: keyDatabase.usageLogs.filter(log => log.key === keyData.key).length
  }));

  return res.status(200).json({
    success: true,
    keys: keysWithStatus,
    totalKeys: keyDatabase.keys.length,
    usedKeys: keyDatabase.keys.filter(k => k.hwid).length,
    unusedKeys: keyDatabase.keys.filter(k => !k.hwid).length
  });
}

// Generate new key
function handleGenerateKey(req, res) {
  const { count = 1, customKey } = req.query;
  const generateCount = Math.min(parseInt(count) || 1, 50); // Max 50 keys at once
  const generatedKeys = [];

  for (let i = 0; i < generateCount; i++) {
    const keyValue = customKey && i === 0 ? customKey : generateKey();
    
    // Check if key already exists
    if (keyDatabase.keys.find(k => k.key === keyValue)) {
      continue;
    }

    const newKey = {
      key: keyValue,
      createdAt: new Date().toISOString(),
      hwid: null,
      lastUsedAt: null,
      isActive: true
    };

    keyDatabase.keys.push(newKey);
    generatedKeys.push(keyValue);
  }

  return res.status(200).json({
    success: true,
    message: `Generated ${generatedKeys.length} key(s)`,
    keys: generatedKeys,
    totalKeys: keyDatabase.keys.length
  });
}

// Delete key
function handleDeleteKey(req, res) {
  const { key } = req.query;
  
  if (!key) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Key parameter is required' 
    });
  }

  const keyIndex = keyDatabase.keys.findIndex(k => k.key === key);
  
  if (keyIndex === -1) {
    return res.status(404).json({ 
      error: 'Not Found', 
      message: 'Key not found' 
    });
  }

  keyDatabase.keys.splice(keyIndex, 1);
  
  // Remove related usage logs
  keyDatabase.usageLogs = keyDatabase.usageLogs.filter(log => log.key !== key);

  return res.status(200).json({
    success: true,
    message: 'Key deleted successfully',
    deletedKey: key,
    totalKeys: keyDatabase.keys.length
  });
}

// Reset key (remove HWID binding)
function handleResetKey(req, res) {
  const { key } = req.query;
  
  if (!key) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Key parameter is required' 
    });
  }

  const keyData = keyDatabase.keys.find(k => k.key === key);
  
  if (!keyData) {
    return res.status(404).json({ 
      error: 'Not Found', 
      message: 'Key not found' 
    });
  }

  keyData.hwid = null;
  keyData.lastUsedAt = null;

  return res.status(200).json({
    success: true,
    message: 'Key reset successfully',
    key: key,
    status: 'Available for new device'
  });
}

// Get usage logs
function handleGetUsageLogs(req, res) {
  const { key, limit = 100 } = req.query;
  let logs = keyDatabase.usageLogs;

  if (key) {
    logs = logs.filter(log => log.key === key);
  }

  // Sort by timestamp (newest first) and limit results
  logs = logs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));

  return res.status(200).json({
    success: true,
    logs: logs,
    totalLogs: keyDatabase.usageLogs.length
  });
}

// Get statistics
function handleGetStats(req, res) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));

  const todayUsage = keyDatabase.usageLogs.filter(log => 
    new Date(log.timestamp) >= today
  ).length;

  const weekUsage = keyDatabase.usageLogs.filter(log => 
    new Date(log.timestamp) >= thisWeek
  ).length;

  const uniqueUsers = [...new Set(keyDatabase.usageLogs.map(log => log.userId))].length;
  const uniqueHWIDs = [...new Set(keyDatabase.keys.filter(k => k.hwid).map(k => k.hwid))].length;

  return res.status(200).json({
    success: true,
    stats: {
      totalKeys: keyDatabase.keys.length,
      usedKeys: keyDatabase.keys.filter(k => k.hwid).length,
      unusedKeys: keyDatabase.keys.filter(k => !k.hwid).length,
      totalUsage: keyDatabase.usageLogs.length,
      todayUsage: todayUsage,
      weekUsage: weekUsage,
      uniqueUsers: uniqueUsers,
      uniqueHWIDs: uniqueHWIDs,
      lastActivity: keyDatabase.usageLogs.length > 0 ? 
        keyDatabase.usageLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp : null
    }
  });
}
