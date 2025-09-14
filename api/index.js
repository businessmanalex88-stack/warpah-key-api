// api/index.js - Main API and Web Interface
const crypto = require('crypto');

// In-memory database (shared across all endpoints)
global.keyDatabase = global.keyDatabase || {
  keys: [],
  usageLogs: [],
  settings: {
    adminPassword: "Whoamidev1819",
    maxKeysPerHWID: 1
  }
};

// Fallback keys for admin/testing
const FALLBACK_KEYS = {
  "Adminganteng": true,
  "Whoamidev": true,
  "WhoAmIAdmin2025": true
};

// Helper functions
function generateKey(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function hashHWID(hwid) {
  return crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
}

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

  global.keyDatabase.usageLogs.push(logEntry);
  
  // Keep only last 1000 logs
  if (global.keyDatabase.usageLogs.length > 1000) {
    global.keyDatabase.usageLogs = global.keyDatabase.usageLogs.slice(-1000);
  }

  return logEntry;
}

// CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// HTML Template for web interface
function getWebInterface() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WarpahVip Key Management System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
            color: #ffffff;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 127, 0.3);
        }

        .header h1 {
            color: #00ff7f;
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 0 20px rgba(0, 255, 127, 0.5);
        }

        .header p {
            color: #b4d4f1;
            font-size: 1.1em;
        }

        .admin-panel {
            display: none;
        }

        .auth-form {
            max-width: 400px;
            margin: 50px auto;
            padding: 30px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 127, 0.3);
        }

        .auth-form h2 {
            text-align: center;
            color: #00ff7f;
            margin-bottom: 25px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #b4d4f1;
            font-weight: 600;
        }

        .form-group input {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 127, 0.3);
            border-radius: 8px;
            color: #ffffff;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: #00ff7f;
            box-shadow: 0 0 15px rgba(0, 255, 127, 0.3);
        }

        .btn {
            background: linear-gradient(135deg, #00c864 0%, #00ff7f 100%);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 255, 127, 0.4);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .btn-danger {
            background: linear-gradient(135deg, #ff4757 0%, #ff6b7a 100%);
        }

        .btn-secondary {
            background: linear-gradient(135deg, #3742fa 0%, #5352ed 100%);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 25px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 127, 0.3);
            text-align: center;
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #00ff7f;
            margin-bottom: 10px;
        }

        .stat-label {
            color: #b4d4f1;
            font-size: 1em;
        }

        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
            align-items: center;
        }

        .key-table {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            overflow: hidden;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 127, 0.3);
        }

        .table-header {
            background: rgba(0, 255, 127, 0.2);
            padding: 20px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
            gap: 15px;
            font-weight: 600;
            color: #00ff7f;
        }

        .key-row {
            padding: 15px 20px;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
            gap: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            transition: background 0.3s ease;
        }

        .key-row:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .key-status {
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            text-align: center;
        }

        .status-unused {
            background: rgba(0, 255, 127, 0.2);
            color: #00ff7f;
        }

        .status-used {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
        }

        .key-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 5px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 1000;
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(15, 20, 25, 0.95);
            padding: 30px;
            border-radius: 15px;
            border: 1px solid rgba(0, 255, 127, 0.3);
            min-width: 400px;
        }

        .modal h3 {
            color: #00ff7f;
            margin-bottom: 20px;
            text-align: center;
        }

        .close {
            position: absolute;
            right: 15px;
            top: 15px;
            background: none;
            border: none;
            color: #ffffff;
            font-size: 24px;
            cursor: pointer;
        }

        .alert {
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 600;
        }

        .alert-success {
            background: rgba(0, 255, 127, 0.2);
            color: #00ff7f;
            border: 1px solid rgba(0, 255, 127, 0.3);
        }

        .alert-error {
            background: rgba(255, 71, 87, 0.2);
            color: #ff4757;
            border: 1px solid rgba(255, 71, 87, 0.3);
        }

        @media (max-width: 768px) {
            .table-header, .key-row {
                grid-template-columns: 1fr;
                text-align: center;
            }
            
            .controls {
                justify-content: center;
            }
            
            .header h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Authentication Form -->
        <div id="authForm" class="auth-form">
            <h2>🔐 Admin Access</h2>
            <div class="form-group">
                <label for="adminPassword">Admin Password:</label>
                <input type="password" id="adminPassword" placeholder="Enter admin password...">
            </div>
            <button class="btn" onclick="authenticate()">
                <span>🚀</span> Login
            </button>
            <div id="authError" style="margin-top: 15px;"></div>
        </div>

        <!-- Admin Panel -->
        <div id="adminPanel" class="admin-panel">
            <!-- Header -->
            <div class="header">
                <h1>🎮 WarpahVip Key Management</h1>
                <p>Professional HWID-Based Key Management System</p>
            </div>

            <!-- Alert Container -->
            <div id="alertContainer"></div>

            <!-- Statistics -->
            <div class="stats-grid" id="statsGrid">
                <!-- Stats will be loaded here -->
            </div>

            <!-- Controls -->
            <div class="controls">
                <button class="btn" onclick="openGenerateModal()">
                    <span>🔑</span> Generate Key
                </button>
                <button class="btn btn-secondary" onclick="loadUsageLogs()">
                    <span>📊</span> View Logs
                </button>
                <button class="btn btn-secondary" onclick="loadKeys()">
                    <span>🔄</span> Refresh
                </button>
                <input type="text" id="searchKey" placeholder="Search keys..." style="padding: 10px; border-radius: 5px; border: 1px solid rgba(0,255,127,0.3); background: rgba(255,255,255,0.1); color: white;">
                <button class="btn btn-secondary" onclick="filterKeys()">
                    <span>🔍</span> Search
                </button>
            </div>

            <!-- Key Management Table -->
            <div class="key-table">
                <div class="table-header">
                    <div>Key</div>
                    <div>Status</div>
                    <div>Created</div>
                    <div>Last Used</div>
                    <div>Actions</div>
                </div>
                <div id="keysList">
                    <!-- Keys will be loaded here -->
                </div>
            </div>
        </div>
    </div>

    <!-- Generate Key Modal -->
    <div id="generateModal" class="modal">
        <div class="modal-content">
            <button class="close" onclick="closeModal('generateModal')">&times;</button>
            <h3>🔑 Generate New Keys</h3>
            <div class="form-group">
                <label>Number of Keys:</label>
                <input type="number" id="keyCount" value="1" min="1" max="50">
            </div>
            <div class="form-group">
                <label>Custom Key (Optional):</label>
                <input type="text" id="customKey" placeholder="Leave empty for random generation">
            </div>
            <button class="btn" onclick="generateKeys()">
                <span>✨</span> Generate
            </button>
        </div>
    </div>

    <!-- Usage Logs Modal -->
    <div id="logsModal" class="modal">
        <div class="modal-content" style="min-width: 800px; max-height: 80vh; overflow-y: auto;">
            <button class="close" onclick="closeModal('logsModal')">&times;</button>
            <h3>📊 Usage Logs</h3>
            <div id="logsContainer">
                <!-- Logs will be loaded here -->
            </div>
        </div>
    </div>

    <script>
        const API_BASE = '/api';
        let adminPassword = '';

        // Authentication
        async function authenticate() {
            const password = document.getElementById('adminPassword').value;
            if (!password) {
                showAuthError('Please enter admin password');
                return;
            }

            try {
                const response = await fetch(\`\${API_BASE}/admin?password=\${password}\`);
                const data = await response.json();

                if (response.ok) {
                    adminPassword = password;
                    document.getElementById('authForm').style.display = 'none';
                    document.getElementById('adminPanel').style.display = 'block';
                    loadDashboard();
                } else {
                    showAuthError(data.message || 'Authentication failed');
                }
            } catch (error) {
                showAuthError('Connection error. Please try again.');
            }
        }

        function showAuthError(message) {
            document.getElementById('authError').innerHTML = \`
                <div class="alert alert-error">\${message}</div>
            \`;
        }

        // Dashboard loading
        async function loadDashboard() {
            await Promise.all([
                loadStats(),
                loadKeys()
            ]);
        }

        // Load statistics
        async function loadStats() {
            try {
                const response = await fetch(\`\${API_BASE}/admin?password=\${adminPassword}&action=getStats\`);
                const data = await response.json();

                if (data.success) {
                    const statsHtml = \`
                        <div class="stat-card">
                            <div class="stat-number">\${data.stats.totalKeys}</div>
                            <div class="stat-label">Total Keys</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.stats.usedKeys}</div>
                            <div class="stat-label">Keys in Use</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.stats.unusedKeys}</div>
                            <div class="stat-label">Available Keys</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.stats.totalUsage}</div>
                            <div class="stat-label">Total Usage</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.stats.uniqueHWIDs}</div>
                            <div class="stat-label">Active Devices</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.stats.todayUsage}</div>
                            <div class="stat-label">Today's Usage</div>
                        </div>
                    \`;
                    document.getElementById('statsGrid').innerHTML = statsHtml;
                }
            } catch (error) {
                showAlert('Error loading statistics', 'error');
            }
        }

        // Load keys with HWID info
        async function loadKeys(searchTerm = '') {
            try {
                const response = await fetch(\`\${API_BASE}/admin?password=\${adminPassword}\`);
                const data = await response.json();

                if (data.success) {
                    let keys = data.keys;
                    
                    if (searchTerm) {
                        keys = keys.filter(key => 
                            key.key.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    }

                    const keysHtml = keys.map(key => \`
                        <div class="key-row">
                            <div>
                                <strong>\${key.key}</strong>
                                \${key.hwid ? \`<br><small style="color: #888;">HWID: \${key.hwid}</small>\` : ''}
                            </div>
                            <div>
                                <span class="key-status \${key.isUsed ? 'status-used' : 'status-unused'}">
                                    \${key.isUsed ? '🔒 In Use' : '🔓 Available'}
                                </span>
                            </div>
                            <div>
                                <small>\${new Date(key.createdAt).toLocaleDateString()}</small>
                            </div>
                            <div>
                                <small>\${key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</small>
                            </div>
                            <div class="key-actions">
                                \${key.isUsed ? \`
                                    <button class="btn btn-secondary btn-small" onclick="resetKey('\${key.key}')">
                                        🔄 Reset HWID
                                    </button>
                                \` : ''}
                                <button class="btn btn-danger btn-small" onclick="deleteKey('\${key.key}')">
                                    🗑️ Delete
                                </button>
                                <button class="btn btn-secondary btn-small" onclick="copyKey('\${key.key}')">
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                    \`).join('');

                    document.getElementById('keysList').innerHTML = keysHtml || '<div style="padding: 20px; text-align: center; color: #888;">No keys found</div>';
                }
            } catch (error) {
                showAlert('Error loading keys', 'error');
            }
        }

        // Generate keys
        async function generateKeys() {
            const count = document.getElementById('keyCount').value;
            const customKey = document.getElementById('customKey').value;
            
            try {
                const url = \`\${API_BASE}/admin?password=\${adminPassword}&action=generateKey&count=\${count}\${customKey ? \`&customKey=\${customKey}\` : ''}\`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.success) {
                    showAlert(\`Successfully generated \${data.keys.length} key(s)\`, 'success');
                    closeModal('generateModal');
                    loadDashboard();
                    
                    // Show generated keys
                    if (data.keys.length <= 5) {
                        showAlert(\`Generated keys: \${data.keys.join(', ')}\`, 'success');
                    }
                } else {
                    showAlert(data.message || 'Failed to generate keys', 'error');
                }
            } catch (error) {
                showAlert('Error generating keys', 'error');
            }
        }

        // Delete key
        async function deleteKey(key) {
            if (!confirm(\`Are you sure you want to delete key: \${key}?\`)) return;

            try {
                const response = await fetch(\`\${API_BASE}/admin?password=\${adminPassword}&action=deleteKey&key=\${key}\`);
                const data = await response.json();

                if (data.success) {
                    showAlert('Key deleted successfully', 'success');
                    loadDashboard();
                } else {
                    showAlert(data.message || 'Failed to delete key', 'error');
                }
            } catch (error) {
                showAlert('Error deleting key', 'error');
            }
        }

        // Reset key HWID
        async function resetKey(key) {
            if (!confirm(\`Reset HWID binding for key: \${key}?\\nThis will allow the key to be used on a different device.\`)) return;

            try {
                const response = await fetch(\`\${API_BASE}/admin?password=\${adminPassword}&action=resetKey&key=\${key}\`);
                const data = await response.json();

                if (data.success) {
                    showAlert('HWID binding reset successfully. Key is now available for new device.', 'success');
                    loadDashboard();
                } else {
                    showAlert(data.message || 'Failed to reset key', 'error');
                }
            } catch (error) {
                showAlert('Error resetting key', 'error');
            }
        }

        // Copy key to clipboard
        function copyKey(key) {
            navigator.clipboard.writeText(key).then(() => {
                showAlert('Key copied to clipboard', 'success');
            }).catch(() => {
                showAlert('Failed to copy key', 'error');
            });
        }

        // Filter keys
        function filterKeys() {
            const searchTerm = document.getElementById('searchKey').value;
            loadKeys(searchTerm);
        }

        // Load usage logs
        async function loadUsageLogs() {
            try {
                const response = await fetch(\`\${API_BASE}/admin?password=\${adminPassword}&action=getUsageLogs&limit=50\`);
                const data = await response.json();

                if (data.success) {
                    const logsHtml = data.logs.map(log => \`
                        <div style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                            <div>
                                <strong>Key:</strong> \${log.key}<br>
                                <small>Type: \${log.type || 'user'}</small>
                            </div>
                            <div>
                                <strong>User:</strong> \${log.username}<br>
                                <small>ID: \${log.userId}</small>
                            </div>
                            <div>
                                <strong>HWID:</strong> \${log.hwid}<br>
                                <small>Place: \${log.placeId}</small>
                            </div>
                            <div>
                                <strong>Time:</strong><br>
                                <small>\${new Date(log.timestamp).toLocaleString()}</small>
                            </div>
                        </div>
                    \`).join('');

                    document.getElementById('logsContainer').innerHTML = logsHtml || '<div style="padding: 20px; text-align: center;">No usage logs found</div>';
                    document.getElementById('logsModal').style.display = 'block';
                }
            } catch (error) {
                showAlert('Error loading usage logs', 'error');
            }
        }

        // Modal functions
        function openGenerateModal() {
            document.getElementById('generateModal').style.display = 'block';
            document.getElementById('keyCount').value = '1';
            document.getElementById('customKey').value = '';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // Alert system
        function showAlert(message, type = 'success') {
            const alertHtml = \`
                <div class="alert alert-\${type}" style="margin-bottom: 20px;">
                    \${message}
                </div>
            \`;
            
            const container = document.getElementById('alertContainer');
            container.innerHTML = alertHtml;
            
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }

        // Close modals when clicking outside
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Enter key support for auth
        document.getElementById('adminPassword').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                authenticate();
            }
        });

        // Search on enter
        if (document.getElementById('searchKey')) {
            document.getElementById('searchKey').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    filterKeys();
                }
            });
        }

        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (adminPassword) {
                loadStats();
            }
        }, 30000);
    </script>
</body>
</html>`;
}

export default function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  
  // Route to web interface
  if (method === 'GET' && url === '/api' || url === '/api/') {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(getWebInterface());
  }

  // Handle validation endpoint
  if (url.includes('/validate') && method === 'POST') {
    return handleValidation(req, res);
  }

  // Handle admin endpoint
  if (url.includes('/admin')) {
    return handleAdmin(req, res);
  }

  // Default response
  return res.status(404).json({ error: 'Not Found' });
}

// Validation handler
function handleValidation(req, res) {
  try {
    const { key, hwid, userInfo = {} } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Key and HWID are required'
      });
    }

    // Check fallback keys first
    if (FALLBACK_KEYS[key]) {
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
    const keyData = global.keyDatabase.keys.find(k => k.key === key && k.isActive);

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
    const hwidKeys = global.keyDatabase.keys.filter(k => k.hwid === hashedHWID);
    if (!keyData.hwid && hwidKeys.length >= global.keyDatabase.settings.maxKeysPerHWID) {
      return res.status(409).json({
        success: false,
        error: 'HWID Limit Exceeded',
        message: `This device has reached the maximum limit of ${global.keyDatabase.settings.maxKeysPerHWID} key(s)`,
        currentKeys: hwidKeys.length
      });
    }

    // Bind key to HWID if not already bound
    if (!keyData.hwid) {
      keyData.hwid = hashedHWID;
    }

    // Update last used timestamp
