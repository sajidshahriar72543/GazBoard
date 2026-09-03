'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

const PAIRING_FILE = path.join(DATA_DIR, 'pairing.json');

const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function generatePairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let code = '';

  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getDeviceToken(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.substring('Bearer '.length).trim();
}

function boardFile(id) {
  // Prevent path traversal such as ../../something
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid board ID');
  }

  return path.join(DATA_DIR, `${id}.json`);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'app://board',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

async function readRequestBody(req) {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
  }

  return body;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'app://board',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }
  try {
    const publicRoute =
      req.method === 'GET' && req.url === '/health';

    const pairingRoute =
      req.url === '/pairing/create' ||
      req.url === '/pairing/redeem';

    if (!publicRoute && !pairingRoute) {
      const token = getDeviceToken(req);

      if (!token) {
        sendJson(res, 401, {
          error: 'Authentication required'
        });

        return;
      }

      let devices = [];

      try {
        const raw = await fs.readFile(DEVICES_FILE, 'utf8');
        devices = JSON.parse(raw);

        if (!Array.isArray(devices)) {
          devices = [];
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          sendJson(res, 401, {
            error: 'Authentication required'
          });

          return;
        }

        throw error;
      }

      const device = devices.find(
        (item) => item && item.token === token
      );

      if (!device) {
        sendJson(res, 401, {
          error: 'Invalid device token'
        });

        return;
      }
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'GazBoard Sync'
      });

      return;
    }

    // Create a one-time pairing code
    if (
      req.method === 'POST' &&
      req.url === '/pairing/create'
    ) {
      const code = generatePairingCode();

      const pairing = {
        code,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
      };

      await fs.writeFile(
        PAIRING_FILE,
        JSON.stringify(pairing),
        'utf8'
      );

      sendJson(res, 200, {
        ok: true,
        code,
        expiresAt: pairing.expiresAt
      });

      return;
    }

    // Redeem a one-time pairing code
    if (
      req.method === 'POST' &&
      req.url === '/pairing/redeem'
    ) {
      const body = await readRequestBody(req);

      let request;

      try {
        request = JSON.parse(body);
      } catch {
        throw new Error('Invalid JSON');
      }

      if (!request || typeof request.code !== 'string') {
        throw new Error('Pairing code is required');
      }

      let pairing;

      try {
        const raw = await fs.readFile(PAIRING_FILE, 'utf8');
        pairing = JSON.parse(raw);
      } catch (error) {
        if (error.code === 'ENOENT') {
          sendJson(res, 400, {
            error: 'No pairing code available'
          });

          return;
        }

        throw error;
      }

      if (
        !pairing ||
        pairing.code !== request.code ||
        typeof pairing.expiresAt !== 'number' ||
        Date.now() > pairing.expiresAt
      ) {
        sendJson(res, 400, {
          error: 'Invalid or expired pairing code'
        });

        return;
      }

      const deviceToken = generateDeviceToken();

      let devices = [];

      try {
        const raw = await fs.readFile(DEVICES_FILE, 'utf8');
        devices = JSON.parse(raw);

        if (!Array.isArray(devices)) {
          devices = [];
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      const deviceId = crypto.randomUUID();

      devices.push({
        deviceId,
        token: deviceToken,
        createdAt: Date.now()
      });

      await fs.writeFile(
        DEVICES_FILE,
        JSON.stringify(devices, null, 2),
        'utf8'
      );

      // Make the pairing code one-time-use.
      await fs.unlink(PAIRING_FILE).catch(() => {});

      sendJson(res, 200, {
        ok: true,
        deviceId,
        deviceToken
      });

      return;
    }

    // Upload board
    if (
      req.method === 'POST' &&
      req.url.startsWith('/boards/')
    ) {
      const id = decodeURIComponent(
        req.url.substring('/boards/'.length)
      );

      const file = boardFile(id);
      const body = await readRequestBody(req);

      let encryptedBoard;

      try {
        encryptedBoard = JSON.parse(body);
      } catch {
        throw new Error('Invalid JSON');
      }

      // Only encrypted GazBoard boards are accepted.
      if (
        !encryptedBoard ||
        encryptedBoard.version !== 1 ||
        encryptedBoard.algorithm !== 'aes-256-gcm' ||
        typeof encryptedBoard.iv !== 'string' ||
        typeof encryptedBoard.tag !== 'string' ||
        typeof encryptedBoard.data !== 'string'
      ) {
        throw new Error('Invalid encrypted board');
      }

      let revision = 1;

      // Check whether this board already exists.
      try {
        const existingRaw = await fs.readFile(file, 'utf8');
        const existing = JSON.parse(existingRaw);

        if (
          existing &&
          typeof existing.revision === 'number'
        ) {
          revision = existing.revision + 1;
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      const syncRecord = {
        revision,
        updatedAt: Date.now(),
        encrypted: encryptedBoard
      };

      await fs.writeFile(
        file,
        JSON.stringify(syncRecord),
        'utf8'
      );

      sendJson(res, 200, {
        ok: true,
        id,
        revision
      });

      return;
    }

    // Get board sync information
        // Download board
        // Get board sync information
    if (
      req.method === 'GET' &&
      req.url.startsWith('/boards/') &&
      req.url.endsWith('/info')
    ) {
      const id = decodeURIComponent(
        req.url.substring(
          '/boards/'.length,
          req.url.length - '/info'.length
        )
      );

      const file = boardFile(id);

      try {
        const raw = await fs.readFile(file, 'utf8');
        const syncRecord = JSON.parse(raw);

        if (
          !syncRecord ||
          typeof syncRecord.revision !== 'number' ||
          typeof syncRecord.updatedAt !== 'number'
        ) {
          throw new Error('Invalid stored board');
        }

        sendJson(res, 200, {
          revision: syncRecord.revision,
          updatedAt: syncRecord.updatedAt
        });

      } catch (error) {
        if (error.code === 'ENOENT') {
          sendJson(res, 404, {
            error: 'Board not found'
          });

          return;
        }

        throw error;
      }

      return;
    }

    // Download board
    if (
      req.method === 'GET' &&
      req.url.startsWith('/boards/') &&
      !req.url.endsWith('/info')
    ) {
      const id = decodeURIComponent(
        req.url.substring('/boards/'.length)
      );

      const file = boardFile(id);

      try {
        const raw = await fs.readFile(file, 'utf8');
        const syncRecord = JSON.parse(raw);

        if (
          !syncRecord ||
          typeof syncRecord.revision !== 'number' ||
          typeof syncRecord.updatedAt !== 'number' ||
          !syncRecord.encrypted
        ) {
          throw new Error('Invalid stored board');
        }

        sendJson(res, 200, syncRecord);

      } catch (error) {
        if (error.code === 'ENOENT') {
          sendJson(res, 404, {
            error: 'Board not found'
          });

          return;
        }

        throw error;
      }

      return;
    }

    sendJson(res, 404, {
      error: 'Not found'
    });

  } catch (error) {
    console.error('[sync] Error:', error.message);

    sendJson(res, 400, {
      error: error.message
    });
  }
});

ensureDataDir()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(
        `GazBoard Sync server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      '[sync] Failed to start:',
      error
    );

    process.exit(1);
  });