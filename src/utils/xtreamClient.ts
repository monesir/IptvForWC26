export interface XtreamCategory {
  category_id: string;
  category_name: string;
}

export interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: string | number;
  stream_icon: string;
  category_id: string;
}

export const fetchXtreamCategories = async (server: string, user: string, pass: string): Promise<XtreamCategory[]> => {
  const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_categories`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('فشل جلب تصنيفات Xtream');
  return res.json();
};

export const fetchXtreamStreams = async (server: string, user: string, pass: string): Promise<XtreamStream[]> => {
  const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('فشل جلب قنوات Xtream');
  return res.json();
};

export const buildXtreamStreamUrl = (server: string, user: string, pass: string, streamId: string | number): string => {
  return `${server}/live/${user}/${pass}/${streamId}.m3u8`;
};
