const FAVORITES_KEY = 'iptv_favorites';

export const getFavorites = (): string[] => {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addFavorite = (channelUrl: string) => {
  const favs = getFavorites();
  if (!favs.includes(channelUrl)) {
    favs.push(channelUrl);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }
};

export const removeFavorite = (channelUrl: string) => {
  let favs = getFavorites();
  favs = favs.filter(url => url !== channelUrl);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
};

export const isFavorite = (channelUrl: string): boolean => {
  return getFavorites().includes(channelUrl);
};

export const toggleFavorite = (channelUrl: string): boolean => {
  if (isFavorite(channelUrl)) {
    removeFavorite(channelUrl);
    return false;
  } else {
    addFavorite(channelUrl);
    return true;
  }
};
