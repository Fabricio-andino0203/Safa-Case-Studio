// Centralized Environment-Aware API & Assets Configuration
const isProd = import.meta.env.PROD;

export const API_URL = isProd ? '/api' : 'http://localhost:5000/api';
export const BASE_URL = isProd ? '' : 'http://localhost:5000';

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // If it's a relative path starting with /uploads, prepend appropriate base
  if (url.startsWith('/uploads')) {
    return `${BASE_URL}${url}`;
  }
  return `${BASE_URL}/uploads/${url}`;
};
