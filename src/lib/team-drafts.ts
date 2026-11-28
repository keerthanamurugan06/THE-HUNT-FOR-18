const PREFIX = 'hunt18:unsent'

export function teamDraftKey(round: number, userId: string) {
  return `${PREFIX}:round-${round}:${userId}`
}

export function readTeamDrafts<T>(key: string): Record<string, T> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, T> : {}
  } catch {
    return {}
  }
}

export function writeTeamDraft<T>(key: string, item: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...readTeamDrafts<T>(key), [item]: value }))
  } catch {
    // The server save remains authoritative; the UI will show the save failure.
  }
}

export function clearTeamDraft(key: string, item: string, expectedValue?: unknown) {
  const drafts = readTeamDrafts<unknown>(key)
  if (!(item in drafts) || (expectedValue !== undefined && JSON.stringify(drafts[item]) !== JSON.stringify(expectedValue))) return
  delete drafts[item]
  try {
    if (Object.keys(drafts).length) localStorage.setItem(key, JSON.stringify(drafts))
    else localStorage.removeItem(key)
  } catch {
    // A stale cache is harmless; restored server data remains authoritative.
  }
}
