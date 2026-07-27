const runtimeJsonPromises = new Map<string, Promise<unknown>>();

export const fetchJsonOnce = async <T>(url: string): Promise<T | null> => {
  const existing = runtimeJsonPromises.get(url) as Promise<T> | undefined;
  if (existing) {
    try { return await existing; } catch { return null; }
  }

  const request = fetch(url, { headers: { Accept: 'application/json' } }).then(async response => {
    if (!response.ok) throw new Error(`Runtime data request failed: ${response.status} ${url}`);
    return await response.json() as T;
  });
  runtimeJsonPromises.set(url, request);

  try {
    return await request;
  } catch (error) {
    runtimeJsonPromises.delete(url);
    console.warn('Runtime data unavailable:', url, error);
    return null;
  }
};

export const clearRuntimeJsonMemoryCache = (): void => runtimeJsonPromises.clear();
