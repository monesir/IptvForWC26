import express from 'express';
import cors from 'cors';
import http from 'http';
import https from 'https';

const app = express();
app.use(cors());

// Keep-Alive Agents for ultra-fast chunk fetching
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

app.get('/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('No url');

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
      headers: {
        'User-Agent': 'VLC/3.0.16'
      }
    };

    const proxyReq = requestModule.request(options, (proxyRes) => {
      // Forward headers
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
              const absoluteChunkUrl = targetDomain + line;
              return 'http://localhost:9999/proxy?url=' + encodeURIComponent(absoluteChunkUrl);
            } else if (line.trim() && !line.startsWith('#') && !line.startsWith('http')) {
              // relative chunk path
              const absoluteChunkUrl = targetDomain + parsedUrl.pathname.replace(/\/[^\/]*$/, '/') + line.trim();
              return 'http://localhost:9999/proxy?url=' + encodeURIComponent(absoluteChunkUrl);
            }
            return line;
          }).join('\n');
          
          res.status(proxyRes.statusCode || 200).send(rewritten);
        });
      } else {
        res.status(proxyRes.statusCode || 200);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', (e) => {
      console.error('Proxy Error:', e);
      if (!res.headersSent) res.status(500).send('Proxy Error');
    });

    proxyReq.end();
  } catch (err) {
    console.error('Invalid URL:', err);
    res.status(400).send('Invalid URL');
  }
});

app.get('/preconnect', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.send('No url');
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
    const preq = requestModule.request(options, (pres) => {
      res.send('Preconnected');
    });
    preq.on('error', () => res.send('Error'));
    preq.end();
  } catch (err) {
    res.send('Invalid');
  }
});

app.listen(9999, () => {
  console.log('IPTV Smart Proxy running on port 9999');
});
