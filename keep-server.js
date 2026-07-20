const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'dev.log');

function start() {
  const logFd = fs.openSync(logPath, 'a');

  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: __dirname,
    stdio: ['ignore', logFd, logFd],
  });

  child.on('exit', () => {
    fs.closeSync(logFd);
    fs.appendFileSync(logPath, '\nServer exited. Restarting in 2s...\n');
    setTimeout(start, 2000);
  });

  child.on('error', (err) => {
    fs.closeSync(logFd);
    fs.appendFileSync(logPath, `Server error: ${err.message}\n`);
    setTimeout(start, 2000);
  });
}

fs.appendFileSync(logPath, `\n--- Server starter ${new Date().toISOString()} ---\n`);
start();