const { exec } = require('child_process');

async function runCommand() {
  await new Promise((resolve, reject) => {
    exec('node ./bin/run.js webdav restart', (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout ?? stderr);
      }
    });
  });
}

runCommand().finally(() => {
  process.exit(0);
});
