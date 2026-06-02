import React, { useEffect, useState, useMemo } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import { parseM3U } from '../utils/m3uParser';
import type { Channel } from '../utils/m3uParser';
import { loadConfig } from '../utils/configManager';
import { fetchXtreamCategories, fetchXtreamStreams, buildXtreamStreamUrl } from '../utils/xtreamClient';
import './LiveTV.css';

let globalChannelsCache: Channel[] | null = null;
let globalCacheKey: string = '';
let globalSelectedGroup: string = '';
let globalCurrentChannel: Channel | null = null;

const LiveTV: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>(globalChannelsCache || []);
  const [loading, setLoading] = useState(!globalChannelsCache);
  const [error, setError] = useState('');
  
  const [selectedGroup, setSelectedGroup] = useState<string>(globalSelectedGroup);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(globalCurrentChannel);

  // Sync state to global variables so it persists on unmount
  useEffect(() => {
    globalSelectedGroup = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    globalCurrentChannel = currentChannel;
  }, [currentChannel]);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const xtServer = loadConfig('xt_server');
        const xtUser = loadConfig('xt_user');
        const xtPass = loadConfig('xt_pass');
        const m3uUrl = loadConfig('m3u_url');
        const m3uContent = loadConfig('m3u_content');

        let parsedChannels: Channel[] = [];
        const currentKey = `${xtServer}-${xtUser}-${xtPass}-${m3uUrl}-${m3uContent}`;

        if (globalChannelsCache && globalCacheKey === currentKey) {
          setChannels(globalChannelsCache);
          setLoading(false);
          return;
        }

        if (xtServer && xtUser && xtPass) {
          // Use Native Xtream Codes JSON API
          const cleanServer = xtServer.endsWith('/') ? xtServer.slice(0, -1) : xtServer;
          const categories = await fetchXtreamCategories(cleanServer, xtUser, xtPass);
          const streams = await fetchXtreamStreams(cleanServer, xtUser, xtPass);
          
          const categoryMap = new Map<string, string>();
          categories.forEach(c => categoryMap.set(c.category_id, c.category_name));
          
          parsedChannels = streams.map(s => {
            const streamUrl = buildXtreamStreamUrl(cleanServer, xtUser, xtPass, s.stream_id);
            return {
              name: s.name,
              logo: s.stream_icon || '',
              group: categoryMap.get(s.category_id) || 'Uncategorized',
              url: `http://localhost:9999/proxy?url=${encodeURIComponent(streamUrl)}`
            };
          });
        } else if (m3uContent || m3uUrl) {
          // Use legacy M3U Parser
          let contentToParse = '';
          if (m3uContent) {
            contentToParse = m3uContent;
          } else if (m3uUrl) {
            const response = await fetch(m3uUrl);
            if (!response.ok) throw new Error('فشل في جلب قائمة القنوات من الرابط.');
            contentToParse = await response.text();
          }
          parsedChannels = parseM3U(contentToParse);
        } else {
          setLoading(false);
          return;
        }

        globalChannelsCache = parsedChannels;
        globalCacheKey = currentKey;
        setChannels(parsedChannels);
        if (parsedChannels.length > 0 && !globalSelectedGroup) {
          const groupsArray = Array.from(new Set(parsedChannels.map(c => c.group)));
          setSelectedGroup(groupsArray[0]);
        }
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء الاتصال بالسيرفر. يرجى التأكد من البيانات.');
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  const groups = useMemo(() => {
    const uniqueGroups = new Set(channels.map(c => c.group));
    return Array.from(uniqueGroups).sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => c.group === selectedGroup);
  }, [channels, selectedGroup]);

  // Keyboard navigation for channels
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (!currentChannel || filteredChannels.length === 0) return;
      
      const currentIndex = filteredChannels.findIndex(c => c.url === currentChannel.url);
      if (currentIndex === -1) return;

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % filteredChannels.length;
        setCurrentChannel(filteredChannels[nextIndex]);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
        setCurrentChannel(filteredChannels[prevIndex]);
      } else if (e.code === 'PageDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 10, filteredChannels.length - 1);
        setCurrentChannel(filteredChannels[nextIndex]);
      } else if (e.code === 'PageUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 10, 0);
        setCurrentChannel(filteredChannels[prevIndex]);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentChannel, filteredChannels]);

  if (loading) {
    return <div className="status-screen">جاري تحميل القنوات، يرجى الانتظار بصبر...</div>;
  }

  if (error) {
    return <div className="status-screen error">{error}</div>;
  }

  if (channels.length === 0) {
    return <div className="status-screen">لا يوجد قنوات مسجلة. الرجاء التوجه إلى الإعدادات لإضافة اشتراكك.</div>;
  }

  return (
    <div className="livetv-container">
      <aside className="groups-sidebar">
        <h3 dir="ltr">Channels ({groups.length})</h3>
        <div className="groups-list">
          {groups.map((group, index) => (
            <button 
              key={index} 
              className={`group-btn ${selectedGroup === group ? 'active' : ''}`}
              onClick={() => setSelectedGroup(group)}
              title={group}
            >
              {group || 'أخرى'}
            </button>
          ))}
        </div>
      </aside>

      <div className="main-content-area">
        <div className="video-section">
          <VideoPlayer url={currentChannel?.url || ''} />
        </div>
        
        <div className="channels-grid-container">
          <div className="channels-grid">
            {filteredChannels.map((channel, index) => (
              <div 
                key={index} 
                className={`channel-card ${currentChannel?.url === channel.url ? 'playing' : ''}`}
                onClick={() => setCurrentChannel(channel)}
              >
                <div className="channel-logo-wrapper">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name} 
                      className="channel-logo" 
                      onError={(e) => (e.currentTarget.style.display = 'none')} 
                    />
                  ) : (
                    <div className="channel-logo-placeholder">📺</div>
                  )}
                </div>
                <div className="channel-name">{channel.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTV;
