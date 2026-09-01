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

  return await response.text();
}

module.exports = {
  uploadBoard,
  downloadBoard
};