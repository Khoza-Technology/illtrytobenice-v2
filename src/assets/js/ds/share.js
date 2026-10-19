/**
 * DS / share.js — share text (Web Share API) with clipboard fallback.
 * @module ds/share
 */

/**
 * Copy text to the clipboard. Uses the async Clipboard API, falling back to a
 * hidden textarea + execCommand('copy').
 * @param {string} text
 * @returns {Promise<boolean>} true if copied
 */
export async function copyText(text) {
  const value = String(text ?? '');
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext !== false) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    const selection = document.getSelection();
    const prevRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    if (prevRange && selection) { selection.removeAllRanges(); selection.addRange(prevRange); }
    return !!ok;
  } catch {
    return false;
  }
}

/**
 * Share text via the native share sheet (e.g. to Google Keep on phones). If Web Share
 * is unavailable or fails, copies `title + text` to the clipboard instead.
 * A user cancelling the share sheet returns 'failed' without copying.
 * @example
 *   const result = await shareText({ title: 'Shopping list', text });
 *   if (result === 'copied') toast('List copied', { action: { label: 'Open Keep', onClick: () => window.open('https://keep.google.com') } });
 * @param {{ title?: string, text: string }} data
 * @returns {Promise<'shared'|'copied'|'failed'>}
 */
export async function shareText({ title = '', text = '' } = {}) {
  const payload = { title, text };
  try {
    const can = typeof navigator !== 'undefined' && typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare(payload));
    if (can) {
      await navigator.share(payload);
      return 'shared';
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return 'failed';
    // NotAllowedError / TypeError etc. → fall back to copy
  }
  const combined = title && !String(text).startsWith(title) ? `${title}\n\n${text}` : String(text);
  return (await copyText(combined)) ? 'copied' : 'failed';
}
