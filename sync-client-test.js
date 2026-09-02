'use strict';

const fs = require('node:fs/promises');

const {
  uploadBoard,
  downloadBoard
} = require('./sync-client');

const BOARD_ID = 'encryption-test-board';

const BOARD_FILE =
  'C:\\Users\\Sajid\\AppData\\Roaming\\GazBoard\\boards\\' +
  BOARD_ID +
  '.json';

async function main() {
  const encryptedBoard = await fs.readFile(
    BOARD_FILE,
    'utf8'
  );

  console.log('Uploading...');

  const uploadResult = await uploadBoard(
    BOARD_ID,
    encryptedBoard
  );

  console.log('Upload result:');
  console.log(uploadResult);

  console.log('\nDownloading...');

  const record = await downloadBoard(BOARD_ID);

  console.log('Revision:', record.revision);
  console.log(
    'Downloaded:',
    !!record.encrypted
  );

  console.log(
    'Data matches:',
    JSON.stringify(record.encrypted) === encryptedBoard
  );
}

main().catch((error) => {
  console.error('Sync client test failed:', error);
  process.exitCode = 1;
});