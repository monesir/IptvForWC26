import { useEffect } from 'react';

export const ISP_URLS = {
  STC: [
    "https://speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://dam-speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://jed-speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://bahrah-speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://makkah-speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://taif-speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://abha-speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://baha-speedtest.saudi.net.sa:8080/speedtest/upload.php"
  ],
  MOBILY: [
    "https://jed.myspeed.net.sa:8080/speedtest/upload.php",
    "https://dam.myspeed.net.sa:8080/speedtest/upload.php",
    "https://taf.myspeed.net.sa:8080/speedtest/upload.php"
  ],
  ZAIN: [
    "https://speedtest.saudi.net.sa:8080/speedtest/upload.php",
    "https://speedtest-dammamnew.sa.zain.com.prod.hosts.ooklaserver.net:8080/speedtest/upload.php"
  ]
};

export type IspProvider = 'NONE' | 'STC' | 'MOBILY' | 'ZAIN';

export const useIspBypass = () => {
  useEffect(() => {
    const allUrls = [
      ...ISP_URLS.STC,
      ...ISP_URLS.MOBILY,
      ...ISP_URLS.ZAIN
    ];

    const runBypass = () => {
      console.log(`[Anti-Throttling] Firing ${allUrls.length} ISP bypass requests...`);
      allUrls.forEach(url => {
        // Fire and forget, no-cors to prevent CORS blocks, cache-busting
        fetch(`${url}?t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' })
          .catch(() => { /* ignore network errors silently */ });
      });
    };

    // Run every 5 seconds for all ISP URLs
    const intervalId = setInterval(runBypass, 5000);
    
    // Initial run
    runBypass();

    return () => clearInterval(intervalId);
  }, []);
};
