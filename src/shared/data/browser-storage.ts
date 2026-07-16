'use client'

import localforage from 'localforage'

import { recordFromJson, readString } from '@/shared/data/json-guards'

function readRawSync(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

/** Synchronous browser persistence (localStorage). Prefer this in services and UI init. */
export const browserStorage = {
  getString(key: string): string | null {
    return readRawSync(key)
  },

  getStringOrDefault(key: string, defaultValue: string): string {
    return readRawSync(key) ?? defaultValue
  },

  setString(key: string, value: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  },

  has(key: string): boolean {
    return readRawSync(key) != null
  },

  getJson(key: string): Record<string, unknown> | null {
    const raw = readRawSync(key)
    if (!raw) return null
    try {
      return recordFromJson(JSON.parse(raw))
    } catch {
      return null
    }
  },

  setJson(key: string, value: Record<string, unknown>): void {
    browserStorage.setString(key, JSON.stringify(value))
  },

  /**
   * AI provider keys are stored as `{ apiKey: string }` JSON or a legacy plain string.
   */
  getAiApiKey(key: string): string {
    const raw = readRawSync(key)
    if (!raw) return ''
    try {
      const parsed = recordFromJson(JSON.parse(raw))
      return readString(parsed.apiKey) ?? raw
    } catch {
      return raw
    }
  },

  keys(): string[] {
    if (typeof window === 'undefined') return []
    return Object.keys(window.localStorage)
  },

  entriesWithPrefix(prefix: string): Array<{ key: string; raw: string }> {
    return browserStorage
      .keys()
      .filter(storageKey => storageKey.startsWith(prefix))
      .map(key => ({ key, raw: readRawSync(key) ?? '' }))
  },

  setObject(key: string, value: object): void {
    browserStorage.setString(key, JSON.stringify(value))
  },

  /** Iterate stored entries by key prefix; removes key when callback throws. */
  forEachPrefixed(prefix: string, onEntry: (key: string, raw: string) => void): void {
    for (const { key, raw } of browserStorage.entriesWithPrefix(prefix)) {
      try {
        onEntry(key, raw)
      } catch {
        browserStorage.remove(key)
      }
    }
  },
}

const STORE_NAME = 'kurvitza-browser'
const LOCALFORAGE_STORE_NAME = 'keyvalue'
const LOCALFORAGE_DESCRIPTION = 'Browser key-value persistence (localforage)'

let configured = false

function ensureConfigured(): void {
  if (configured) return
  localforage.config({
    name: STORE_NAME,
    storeName: LOCALFORAGE_STORE_NAME,
    description: LOCALFORAGE_DESCRIPTION,
  })
  configured = true
}

async function readRawAsync(key: string): Promise<string | null> {
  ensureConfigured()
  const value = await localforage.getItem<string>(key)
  return value ?? null
}

/** Async persistence (localforage). Use when awaiting in hooks/effects is fine. */
export const browserStorageAsync = {
  async getString(key: string): Promise<string | null> {
    return readRawAsync(key)
  },

  async setString(key: string, value: string): Promise<void> {
    ensureConfigured()
    await localforage.setItem(key, value)
  },

  async remove(key: string): Promise<void> {
    ensureConfigured()
    await localforage.removeItem(key)
  },

  async getJson(key: string): Promise<Record<string, unknown> | null> {
    const raw = await readRawAsync(key)
    if (!raw) return null
    try {
      return recordFromJson(JSON.parse(raw))
    } catch {
      return null
    }
  },

  async setJson(key: string, value: Record<string, unknown>): Promise<void> {
    await browserStorageAsync.setString(key, JSON.stringify(value))
  },

  async getAiApiKey(key: string): Promise<string> {
    const raw = await readRawAsync(key)
    if (!raw) return ''
    try {
      const parsed = recordFromJson(JSON.parse(raw))
      return readString(parsed.apiKey) ?? raw
    } catch {
      return raw
    }
  },
}
