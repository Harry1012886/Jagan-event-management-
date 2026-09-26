/** iPhone / iPad Safari blocks popups in standalone mode; use redirects there. */
export function isAppleTouchDevice() {
  if (typeof navigator === 'undefined') return false
  const agent = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(agent)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}
