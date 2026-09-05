/**
 * Gate fixture — MUST fail `local/prefer-await-try-catch`.
 * Never imported by src/.
 */

export function loadName(url: string): Promise<string> {
  // Expected error: local/prefer-await-try-catch (then)
  return fetch(url)
    .then(response => response.text())
    .catch(() => '')
}

export async function loadNameAwait(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    return await response.text()
  } catch {
    return ''
  }
}
