import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('===================================================');
console.log('  Parallax Studio - Khởi động Hệ thống Hợp nhất   ');
console.log('===================================================');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

// 1. Khởi động Application Service (authoritative state trên port 3100)
console.log('\n[1/2] Đang khởi động Application Service (Port 3100)...');
const serviceProcess = spawn(npxCmd, ['tsx', 'service/bootstrap.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, PARALLAX_SERVICE_PORT: '3100' },
});

serviceProcess.on('error', (err) => {
  console.error('[Service Error]:', err);
});

// 2. Khởi động Vite Editor Frontend (port 5173)
console.log('\n[2/2] Đang khởi động Vite Editor UI (Port 5173)...');
const viteProcess = spawn(npxCmd, ['vite', '--host', '127.0.0.1'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWindows,
});

viteProcess.on('error', (err) => {
  console.error('[Vite Error]:', err);
});

const cleanup = () => {
  console.log('\nĐang dừng toàn bộ tiến trình Parallax Studio...');
  if (isWindows) {
    if (serviceProcess.pid) {
      spawn('taskkill', ['/pid', String(serviceProcess.pid), '/T', '/F'], {
        shell: true,
      });
    }
    if (viteProcess.pid) {
      spawn('taskkill', ['/pid', String(viteProcess.pid), '/T', '/F'], {
        shell: true,
      });
    }
  } else {
    serviceProcess.kill('SIGTERM');
    viteProcess.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
