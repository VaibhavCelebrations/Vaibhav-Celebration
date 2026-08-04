export class CacheStore {
  // --- Local & Session Storage (Synchronous) ---
  
  static getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  }

  static setItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Failed to save to cache store", e);
    }
  }

  static getSessionItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return defaultValue;
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  }

  static setSessionItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Failed to save to session store", e);
    }
  }

  // --- Cookies (Synchronous) ---
  
  static setCookie(name: string, value: string, days = 7) {
    if (typeof document === "undefined") return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/`;
  }

  static getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
  }

  // --- IndexedDB (Asynchronous) ---
  
  private static dbPromise: Promise<IDBDatabase> | null = null;
  
  private static getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") return Promise.reject("SSR");
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("vc_cache_store", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("cache")) {
            db.createObjectStore("cache");
          }
        };
      });
    }
    return this.dbPromise;
  }

  static async getIDBItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await this.getDB();
      return new Promise<T>((resolve, reject) => {
        const tx = db.transaction("cache", "readonly");
        const store = tx.objectStore("cache");
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result === undefined) return resolve(defaultValue);
          const data = req.result;
          // Check TTL
          if (data.expiresAt && Date.now() > data.expiresAt) {
            resolve(defaultValue);
          } else {
            resolve(data.value as T);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return defaultValue;
    }
  }

  static async setIDBItem<T>(key: string, value: T, ttlSeconds = 86400): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction("cache", "readwrite");
        const store = tx.objectStore("cache");
        const expiresAt = Date.now() + ttlSeconds * 1000;
        const req = store.put({ value, expiresAt }, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignore
    }
  }
}
