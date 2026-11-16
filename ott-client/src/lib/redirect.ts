/** Only accept same-app paths, never full URLs (prevents open redirects) */
export function safeRedirect(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
