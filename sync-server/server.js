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

        let board;

        try {
        board = JSON.parse(body);
        } catch {
        throw new Error('Invalid JSON');
        }

        // Only encrypted GazBoard boards are accepted.
        if (
        !board ||
        board.version !== 1 ||
        board.algorithm !== 'aes-256-gcm' ||
        typeof board.iv !== 'string' ||
        typeof board.tag !== 'string' ||
        typeof board.data !== 'string'
        ) {
        throw new Error('Invalid encrypted board');
        }

        await fs.writeFile(file, body, 'utf8');

      sendJson(res, 200, {
        ok: true,
        id
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
        const board = await fs.readFile(file, 'utf8');

        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(board);

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