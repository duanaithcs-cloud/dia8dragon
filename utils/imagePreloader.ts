const loadedImages = new Set<string>();
const pendingImages = new Map<string, Promise<void>>();

const normalizeUrl = (url?: string) => (url || "").trim();

export const isImagePreloaded = (url?: string) => loadedImages.has(normalizeUrl(url));

export const preloadImage = (url?: string): Promise<void> => {
  const src = normalizeUrl(url);
  if (!src || loadedImages.has(src)) return Promise.resolve();
  const pending = pendingImages.get(src);
  if (pending) return pending;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      loadedImages.add(src);
      pendingImages.delete(src);
      resolve();
    };
    img.onerror = () => {
      pendingImages.delete(src);
      resolve();
    };
    img.src = src;
  });

  pendingImages.set(src, promise);
  return promise;
};

export const preloadImagesInBatches = (urls: string[], batchSize = 3) => {
  const queue = urls.filter(Boolean);
  const run = () => {
    const batch = queue.splice(0, batchSize);
    batch.forEach((url) => void preloadImage(url));
    if (!queue.length) return;

    const idle = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout: number }) => number)
      | undefined;

    if (idle) idle(run, { timeout: 1200 });
    else window.setTimeout(run, 500);
  };

  run();
};
