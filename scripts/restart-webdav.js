const { exec } = require('child_process');

async function runCommand() {
  try {
    const output = await new Promise((resolve, reject) => {
      exec('node ./bin/run.js webdav restart', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout || stderr);
      });
    });
    console.log('Command output:', output);
  } catch (error) {
    console.error('Command failed with error:', error);
  }
}

runCommand();
