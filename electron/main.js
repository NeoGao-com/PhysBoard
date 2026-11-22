/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

let localServer = null;
let serverPort = 0;

function startStaticServer(outDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const rawPath = (req.url || '/').split('?')[0];
        let safePath = path.normalize(decodeURIComponent(rawPath)).replace(/^(\.\.[\/\\])+/, '');
        if (safePath === '/' || safePath === '\\') safePath = 'index.html';

        let targetFile = path.join(outDir, safePath);

        // If file doesn't exist directly, check for .html extension or directory/index.html
        if (!fs.existsSync(targetFile)) {
          if (fs.existsSync(targetFile + '.html')) {
            targetFile = targetFile + '.html';
          } else if (fs.existsSync(path.join(targetFile, 'index.html'))) {
            targetFile = path.join(targetFile, 'index.html');
          } else {
            // SPA fallback to index.html for client-side routing
            targetFile = path.join(outDir, 'index.html');
          }
        } else if (fs.statSync(targetFile).isDirectory()) {
          targetFile = path.join(targetFile, 'index.html');
        }

        if (!fs.existsSync(targetFile)) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }

        const ext = path.extname(targetFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(targetFile).pipe(res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server Error: ' + err.message);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function createMainWindow() {
  const outDir = path.join(__dirname, '..', 'out');
  if (!localServer) {
    const s = await startStaticServer(outDir);
    localServer = s.server;
    serverPort = s.port;
  }

  const win = new BrowserWindow({
    title: 'PhysBoard',
    width: 1366,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: '#FBFBFD',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Handle external links safely
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://127.0.0.1:${serverPort}`) || url.startsWith('file://')) {
      return { action: 'allow' };
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${serverPort}`) && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  await win.loadURL(`http://127.0.0.1:${serverPort}/`);
  return win;
}

app.whenReady().then(async () => {
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('second-instance', () => {
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
  }
});

app.on('before-quit', () => {
  if (localServer) {
    try {
      localServer.close();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
