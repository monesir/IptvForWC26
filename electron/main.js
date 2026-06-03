import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Embedded Proxy Server ───
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

function startProxy() {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const reqUrl = new URL(req.url || '/', `http://localhost`);

    if (reqUrl.pathname === '/proxy') {
      const targetUrl = reqUrl.searchParams.get('url');
      if (!targetUrl) { res.writeHead(400); res.end('No url'); return; }

      try {
        const parsedUrl = new URL(targetUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const requestModule = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          agent: isHttps ? httpsAgent : httpAgent,
          headers: { 'User-Agent': 'VLC/3.0.16' }
        };

        const proxyReq = requestModule.request(options, (proxyRes) => {
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (key.toLowerCase() === 'location') {
              res.setHeader(key, 'http://localhost:9999/proxy?url=' + encodeURIComponent(value));
            } else if (!['access-control-allow-origin', 'content-length'].includes(key.toLowerCase())) {
              res.setHeader(key, value);
            }
          }
          res.setHeader('Access-Control-Allow-Origin', '*');

          const contentType = proxyRes.headers['content-type'] || '';
          if (contentType.includes('mpegURL') || contentType.includes('m3u8')) {
            let body = '';
            proxyRes.on('data', chunk => body += chunk.toString());
            proxyRes.on('end', () => {
              const targetDomain = parsedUrl.origin;
              const rewritten = body.split('\n').map(line => {
                if (line.startsWith('/')) {
                  return 'http://localhost:9999/proxy?url=' + encodeURIComponent(targetDomain + line);
                } else if (line.trim() && !line.startsWith('#') && !line.startsWith('http')) {
                  const absoluteChunkUrl = targetDomain + parsedUrl.pathname.replace(/\/[^\/]*$/, '/') + line.trim();
                  return 'http://localhost:9999/proxy?url=' + encodeURIComponent(absoluteChunkUrl);
                }
                return line;
              }).join('\n');
              res.writeHead(proxyRes.statusCode || 200);
              res.end(rewritten);
            });
          } else {
            res.writeHead(proxyRes.statusCode || 200);
            proxyRes.pipe(res);
          }
        });

        proxyReq.on('error', (e) => {
          console.error('Proxy Error:', e.message);
          if (!res.headersSent) { res.writeHead(500); res.end('Proxy Error'); }
        });
        proxyReq.end();
      } catch (err) {
        res.writeHead(400); res.end('Invalid URL');
      }

    } else if (reqUrl.pathname === '/preconnect') {
      const targetUrl = reqUrl.searchParams.get('url');
      if (!targetUrl) { res.end('No url'); return; }
      try {
        const parsedUrl = new URL(targetUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const requestModule = isHttps ? https : http;
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: '/',
          method: 'HEAD',
          agent: isHttps ? httpsAgent : httpAgent,
          headers: { 'User-Agent': 'VLC/3.0.16' }
        };
        const preq = requestModule.request(options, () => res.end('Preconnected'));
        preq.on('error', () => res.end('Error'));
        preq.end();
      } catch (err) {
        res.end('Invalid');
      }

    } else {
      res.writeHead(404); res.end('Not Found');
    }
  });

  server.listen(9999, () => {
    console.log('IPTV Smart Proxy running on port 9999');
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('Port 9999 already in use, proxy may already be running.');
    } else {
      console.error('Proxy server error:', e);
    }
  });

  return server;
}

// ─── Electron App ───
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0F2424',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5199');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // Bypass IPTV Provider Blocks (Anti-hotlinking & User-Agent filtering)
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'VLC/3.0.16';
    delete details.requestHeaders['Origin'];
    delete details.requestHeaders['Referer'];
    callback({ requestHeaders: details.requestHeaders });
  });

  // Start embedded proxy
  startProxy();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
