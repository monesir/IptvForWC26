import { useEffect } from 'react';
import { loadConfig } from '../utils/configManager';

export const usePreconnect = () => {
  useEffect(() => {
    const serverUrl = loadConfig('xt_server');
    if (serverUrl) {
      // Fire a preconnect ping to our proxy, which will establish and hold 
      // a keep-alive TCP/TLS socket open with the Xtream server.
      const proxyUrl = `http://localhost:9999/preconnect?url=${encodeURIComponent(serverUrl)}`;
      fetch(proxyUrl, { method: 'GET', mode: 'no-cors' })
        .catch(() => { /* silent */ });
    }
  }, []);
};
