interface ServiceWorkerRegistrationLike {
  unregister: () => Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations: () => Promise<ServiceWorkerRegistrationLike[]>;
}

interface CacheStorageLike {
  keys: () => Promise<string[]>;
  delete: (key: string) => Promise<boolean>;
}

function getServiceWorkerContainer(): ServiceWorkerContainerLike | null {
  const nav = globalThis.navigator as Navigator | undefined;
  if (!nav || !("serviceWorker" in nav)) return null;

  const container = nav.serviceWorker as unknown as ServiceWorkerContainerLike;
  return typeof container?.getRegistrations === "function" ? container : null;
}

function getCacheStorage(): CacheStorageLike | null {
  const cacheStorage = (globalThis as { caches?: CacheStorageLike }).caches;
  if (!cacheStorage) return null;

  const hasRequiredApi =
    typeof cacheStorage.keys === "function" && typeof cacheStorage.delete === "function";
  return hasRequiredApi ? cacheStorage : null;
}

export async function resetAppRuntimeCaches(): Promise<void> {
  const swContainer = getServiceWorkerContainer();
  if (swContainer) {
    try {
      const registrations = await swContainer.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.unregister();
          } catch {
            // Continue reset flow even if one registration fails.
          }
        })
      );
    } catch {
      // Continue reset flow when service worker registration listing fails.
    }
  }

  const cacheStorage = getCacheStorage();
  if (cacheStorage) {
    try {
      const cacheKeys = await cacheStorage.keys();
      await Promise.all(
        cacheKeys.map(async (key) => {
          try {
            await cacheStorage.delete(key);
          } catch {
            // Continue reset flow even if one cache key fails.
          }
        })
      );
    } catch {
      // Continue reset flow when cache listing fails.
    }
  }
}
