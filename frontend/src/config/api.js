const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const rawBackendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8000';
const rawApiBase = import.meta.env.VITE_API_BASE_URL || `${trimTrailingSlash(rawBackendOrigin)}/api`;

export const BACKEND_ORIGIN = trimTrailingSlash(rawBackendOrigin);
export const API_BASE_URL = trimTrailingSlash(rawApiBase);
