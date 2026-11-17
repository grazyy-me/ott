/** Base URL of ott-server, without a trailing slash */
export const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
).replace(/\/$/, '')

export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Streamly'
