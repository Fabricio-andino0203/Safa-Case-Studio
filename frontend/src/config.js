// Centralized Environment-Aware API & Assets Configuration
const isProd = import.meta.env.PROD;

export const API_URL = isProd ? '/api' : 'http://localhost:5000/api';
export const BASE_URL = isProd ? '' : 'http://localhost:5000';

export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // Clean the path: remove leading / and any existing uploads/ prefix
  let cleanPath = url.startsWith('/') ? url.substring(1) : url;
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.substring(8);
  }
  
  const prefix = isProd ? '/api/uploads' : `${BASE_URL}/uploads`;
  return `${prefix}/${cleanPath}`;
};
