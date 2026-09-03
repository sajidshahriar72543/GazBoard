'use strict';

const SERVER_URL =
  process.env.GAZBOARD_SYNC_SERVER || 'http://localhost:3000';

let DEVICE_TOKEN = null;

function setDeviceToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid device token');
  }

  DEVICE_TOKEN = token;
}

function getAuthHeaders() {
  if (!DEVICE_TOKEN) {
    throw new Error('Device is not paired');
  }

  return {
    Authorization: `Bearer ${DEVICE_TOKEN}`
  };
}

async function uploadBoard(id, encryptedBoard) {
  const response = await fetch(
    `${SERVER_URL}/boards/${encodeURIComponent(id)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: encryptedBoard
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Upload failed');
  }

  return result;
}

async function getBoardInfo(id) {
  const response = await fetch(
    `${SERVER_URL}/boards/${encodeURIComponent(id)}/info`,
    {
      headers: getAuthHeaders()
    }
  );

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));

    throw new Error(
      result.error || `Sync check failed: HTTP ${response.status}`
    );
  }

  const record = await response.json();

  if (
    !record ||
    typeof record.revision !== 'number' ||
    typeof record.updatedAt !== 'number'
  ) {
    throw new Error('Invalid sync info');
  }

  return {
    revision: record.revision,
    updatedAt: record.updatedAt
  };
}

async function downloadBoard(id) {
  const response = await fetch(
    `${SERVER_URL}/boards/${encodeURIComponent(id)}`,
    {
      headers: getAuthHeaders()
    }
  );

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));

    throw new Error(
      result.error || `Download failed: HTTP ${response.status}`
    );
  }

  const record = await response.json();

  if (
    !record ||
    typeof record.revision !== 'number' ||
    typeof record.updatedAt !== 'number' ||
    !record.encrypted
  ) {
    throw new Error('Invalid sync record');
  }

  return record;
}

async function createPairingCode() {
  const response = await fetch(
    `${SERVER_URL}/pairing/create`,
    {
      method: 'POST'
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || 'Could not create pairing code'
    );
  }

  return result;
}

async function redeemPairingCode(code) {
  const response = await fetch(
    `${SERVER_URL}/pairing/redeem`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: code.trim().toUpperCase()
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || 'Invalid pairing code'
    );
  }

  return result;
}

module.exports = {
  setDeviceToken,
  uploadBoard,
  downloadBoard,
  getBoardInfo,
  createPairingCode,
  redeemPairingCode
};