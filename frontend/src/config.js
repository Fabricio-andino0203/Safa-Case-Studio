// Centralized Environment-Aware API & Assets Configuration
const isProd = import.meta.env.PROD;

export const API_URL = isProd ? '/api' : 'http://localhost:5000/api';
export const BASE_URL = isProd ? '' : 'http://localhost:5000';

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // Get just the filename from the path (e.g. /uploads/abc.png -> abc.png)
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  
  // All uploads should be accessible via API_URL (which is /api in prod) + /uploads
  // So /api/uploads/filename
  return `${API_URL}/uploads/${filename}`;
};
