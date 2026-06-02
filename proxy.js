import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();
app.use(cors());

app.get('/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('No url');

  try {
    const parsedUrl = new URL(targetUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.16'
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
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

app.listen(9999, () => {
  console.log('IPTV Smart Proxy running on port 9999');
});
