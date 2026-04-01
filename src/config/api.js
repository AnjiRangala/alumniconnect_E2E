const rawBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()

const normalize = (url) => String(url || '').replace(/\/+$/, '')

export const API_BASE_URL = rawBaseUrl
  ? normalize(rawBaseUrl)
  : (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
