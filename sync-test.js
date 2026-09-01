'use strict';

const fs = require('node:fs/promises');

const BOARD_ID = 'encryption-test-board';
const BOARD_FILE =
  'C:\\Users\\Sajid\\AppData\\Roaming\\GazBoard\\boards\\' +
  BOARD_ID +
  '.json';

const SERVER = 'http://localhost:3000';

async function uploadBoard() {
  const encryptedBoard = await fs.readFile(
    BOARD_FILE,
    'utf8'
  );

  const response = await fetch(
    `${SERVER}/boards/${BOARD_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: encryptedBoard
    }
  );

  return await response.json();
}

async function downloadBoard() {
  const response = await fetch(
    `${SERVER}/boards/${BOARD_ID}`
  );

  if (!response.ok) {
    throw new Error(
      `Download failed: HTTP ${response.status}`
    );
  }

  return await response.text();
}

async function main() {
  console.log('Uploading encrypted board...');

  const uploadResult = await uploadBoard();

  console.log('Upload result:');
  console.log(uploadResult);

  console.log('\nDownloading board...');

  const downloaded = await downloadBoard();

  const original = await fs.readFile(
    BOARD_FILE,
    'utf8'
  );

  console.log('Downloaded successfully:', true);
  console.log('Data matches:', downloaded === original);
}

main().catch((error) => {
  console.error('Sync test failed:', error);
  process.exitCode = 1;
});