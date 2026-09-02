'use strict';

const SERVER_URL = 'http://localhost:3000';

async function uploadBoard(id, encryptedBoard) {
  const response = await fetch(
    `${SERVER_URL}/boards/${encodeURIComponent(id)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
    `${SERVER_URL}/boards/${encodeURIComponent(id)}/info`
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
    `${SERVER_URL}/boards/${encodeURIComponent(id)}`
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

module.exports = {
  uploadBoard,
  downloadBoard,
  getBoardInfo
};