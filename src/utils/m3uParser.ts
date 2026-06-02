export interface Channel {
  name: string;
  url: string;
  logo: string;
  group: string;
}

export const parseM3U = (content: string): Channel[] => {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    if (line.startsWith('#EXTINF:')) {
      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      currentChannel.logo = logoMatch ? logoMatch[1] : '';

      // Extract group-title
      const groupMatch = line.match(/group-title="(.*?)"/);
      currentChannel.group = groupMatch ? groupMatch[1] : 'Uncategorized';

      // Extract channel name (usually after the last comma)
      const commaIndex = line.lastIndexOf(',');
      currentChannel.name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Unknown Channel';
    } else if (!line.startsWith('#')) {
      // This is likely the stream URL
      currentChannel.url = line;
      if (currentChannel.url && currentChannel.name) {
        channels.push(currentChannel as Channel);
      }
      // Reset for next channel
      currentChannel = {};
    }
  }

  return channels;
};
