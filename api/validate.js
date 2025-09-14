// api/validate.js
const crypto = require('crypto');

// Shared database dengan admin.js (dalam implementasi nyata, gunakan database eksternal)
// Untuk demo ini, kita simulasi dengan storage sederhana
let keyDatabase = {
  keys: [],
  usageLogs: [],
  settings: {
    adminPassword: "Whoamidev1819",
    maxKeysPerHWID: 1
  }
};

// Fallback keys untuk admin/testing
const FALLBACK_KEYS = {
  "Adminganteng": true,
  "Whoamidev": true,
  "WhoAmIAdmin2025": true
};

// Helper function untuk hash HWID
function hashHWID(hwid) {
  return crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
}

// Helper function untuk log usage
function logKeyUsage(keyData, hwid, userInfo) {
  const logEntry = {
    id: crypto.randomUUID(),
    key: keyData.key,
    hwid: hashHWID(hwid),
    userId: userInfo.userId || 'unknown',
    username: userInfo.username || 'unknown',
    placeId: userInfo.placeId || 0,
    timestamp: new Date().toISOString(),
    ip: userInfo.ip || 'unknown',
    userAgent: userInfo.userAgent || 'unknown'
  };

  keyDatabase.usageLogs.push(logEntry);
  
  // Keep only last 1000 logs to prevent memory issues
  if (keyDatabase.usageLogs.length > 1000) {
    keyDatabase.usageLogs = keyDatabase.usageLogs.slice(-1000);
  }

  return logEntry;
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const { key, hwid, userInfo = {} } = req.body;

    // Validasi input
    if (!key || !hwid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Key and HWID are required'
      });
    }

    // Check fallback keys first (admin keys)
    if (FALLBACK_KEYS[key]) {
      // Log admin key usage
      logKeyUsage({ key: key }, hwid, {
        ...userInfo,
        type: 'admin'
      });

      return res.status(200).json({
        success: true,
        message: 'Admin key validated successfully',
        keyType: 'admin',
        hwid: hashHWID(hwid),
        validatedAt: new Date().toISOString()
      });
    }

    // Find key in database
    const keyData = keyDatabase.keys.find(k => k.key === key && k.isActive);

    if (!keyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Key',
        message: 'Key not found or inactive'
      });
    }

    const hashedHWID = hashHWID(hwid);

    // Check if key is already bound to a different HWID
    if (keyData.hwid && keyData.hwid !== hashedHWID) {
      return res.status(409).json({
        success: false,
        error: 'HWID Mismatch',
        message: 'This key is already bound to another device',
        boundHWID: keyData.hwid
      });
    }

    // Check if this HWID already has the maximum number of keys
    const hwidKeys = keyDatabase.keys.filter(k => k.hwid === hashedHWID);
    if (!keyData.hwid && hwidKeys.length >= keyDatabase.settings.maxKeysPerHWID) {
      return res.status(409).json({
        success: false,
        error: 'HWID Limit Exceeded',
        message: `This device has reached the maximum limit of ${keyDatabase.settings.maxKeysPerHWID} key(s)`,
        currentKeys: hwidKeys.length
      });
    }

    // Bind key to HWID if not already bound
    if (!keyData.hwid) {
      keyData.hwid = hashedHWID;
    }

    // Update last used timestamp
    keyData.lastUsedAt = new Date().toISOString();

    // Log the usage
    const logEntry = logKeyUsage(keyData, hwid, userInfo);

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Key validated successfully',
      keyType: 'user',
      key: keyData.key,
      hwid: hashedHWID,
      boundAt: keyData.hwid === hashedHWID ? keyData.lastUsedAt : new Date().toISOString(),
      validatedAt: new Date().toISOString(),
      usageCount: keyDatabase.usageLogs.filter(log => log.key === key).length
    });

  } catch (error) {
    console.error('Validation API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while validating the key'
    });
  }
}
