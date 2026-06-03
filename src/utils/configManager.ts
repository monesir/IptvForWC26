/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;
const _require = (window as any).require;
const fs = _require('fs');
const path = _require('path');

const configPath = path.join(process?.cwd?.() || '.', 'config.json');

export const saveConfig = (key: string, value: string) => {
  try {
    let current: any = {};
    if (fs.existsSync(configPath)) {
      current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    current[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
  } catch (err) {
    console.error("Error saving config:", err);
  }
};

export const loadConfig = (key: string): string => {
  try {
    if (fs.existsSync(configPath)) {
      const current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return current[key] || '';
    }
  } catch (err) {
    console.error("Error loading config:", err);
  }
  return '';
};

export const removeConfig = (key: string) => {
  try {
    let current: any = {};
    if (fs.existsSync(configPath)) {
      current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    delete current[key];
    fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
  } catch (err) {
    console.error("Error removing config:", err);
  }
};
