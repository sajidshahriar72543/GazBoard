'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function boardFile(id) {
  // Prevent path traversal such as ../../something
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid board ID');
  }

  return path.join(DATA_DIR, `${id}.json`);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json'
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
  try {
    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'GazBoard Sync'
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

    // Download board
    if (
      req.method === 'GET' &&
      req.url.startsWith('/boards/')
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
    server.listen(PORT, () => {
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