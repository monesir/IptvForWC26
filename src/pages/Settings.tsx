import React, { useState } from 'react';
import { saveConfig, loadConfig, removeConfig } from '../utils/configManager';
import './Settings.css';

const Settings: React.FC = () => {
  const [url, setUrl] = useState(loadConfig('m3u_url'));
  
  // Xtream Codes state
  const [server, setServer] = useState(loadConfig('xt_server'));
  const [username, setUsername] = useState(loadConfig('xt_user'));
  const [password, setPassword] = useState(loadConfig('xt_pass'));

  const handleSaveUrl = () => {
    if (url) {
      saveConfig('m3u_url', url);
      removeConfig('m3u_content');
      removeConfig('xt_server');
      alert('تم حفظ رابط M3U بنجاح! سيتم جلب القنوات.');
    }
  };

  const handleSaveXtream = () => {
    if (server && username && password) {
      saveConfig('xt_server', server);
      saveConfig('xt_user', username);
      saveConfig('xt_pass', password);
      
      removeConfig('m3u_url'); // Clear old configs to avoid conflict
      removeConfig('m3u_content'); 
      alert('تم حفظ بيانات سيرفر Xtream بنجاح!');
    } else {
      alert('الرجاء إدخال جميع بيانات السيرفر.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        saveConfig('m3u_content', content);
        removeConfig('m3u_url');
        removeConfig('xt_server');
        alert('تم قراءة الملف وحفظه بنجاح!');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="settings-page">
      <h2>إعدادات القنوات (M3U)</h2>
      <div className="settings-card">
        <h3>الخيار الأول: إدخال رابط M3U</h3>
        <p>قم بلصق رابط قائمة القنوات الخاص بك هنا</p>
        <div className="input-group">
          <input 
            type="text" 
            placeholder="https://example.com/playlist.m3u" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button onClick={handleSaveUrl}>حفظ الرابط</button>
        </div>
      </div>

      <div className="settings-card">
        <h3>الخيار الثاني: حساب سيرفر (Xtream Codes)</h3>
        <p>قم بإدخال بيانات الاشتراك الخاصة بك (الرابط، اسم المستخدم، كلمة المرور)</p>
        <div className="xtream-form">
          <input 
            type="text" 
            placeholder="رابط السيرفر (مثال: http://domain.com:8080)" 
            value={server}
            onChange={(e) => setServer(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="اسم المستخدم (Username)" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="كلمة المرور (Password)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleSaveXtream}>تسجيل الدخول وحفظ</button>
        </div>
      </div>

      <div className="settings-card">
        <h3>الخيار الثالث: رفع ملف M3U</h3>
        <p>اختر ملف القنوات من جهازك بصيغة .m3u</p>
        <div className="input-group">
          <label className="file-upload-btn">
            اختر ملف...
            <input type="file" accept=".m3u" onChange={handleFileUpload} hidden />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;
