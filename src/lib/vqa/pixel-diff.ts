// Client-side pixel-diff engine (pure canvas, no dependencies). Computes a
// normalized change ratio, coarse change regions for the AI, and a heatmap
// preview it can return for persistence.

export interface PixelDiffOutput {
  ratio: number;
  changedPixels: number;
  regions: Array<{ x: number; y: number; w: number; h: number }>;
  heatmapDataUrl?: string;
}

const MAX_WIDTH = 720;
const CHANNEL_THRESHOLD = 30;
const CELL_GRID = 8;
const REGION_RATIO_MIN = 0.05;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolvePromise, reject) => {
    const image = new Image();
    image.onload = () => resolvePromise(image);
    image.onerror = () => reject(new Error("Could not load screenshot."));
    image.src = src;
  });
}

function prepareCanvas(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable.");
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export async function pixelDiff(beforeSrc: string, afterSrc: string): Promise<PixelDiffOutput> {
  const [beforeImage, afterImage] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)]);

  const width = Math.max(64, Math.min(MAX_WIDTH, Math.max(beforeImage.width, afterImage.width)));
  const scaleA = width / beforeImage.width;
  const scaleB = width / afterImage.width;
  const heightA = Math.round(beforeImage.height * scaleA);
  const heightB = Math.round(afterImage.height * scaleB);
  const height = Math.max(64, Math.min(Math.max(heightA, heightB), MAX_WIDTH));

  const dataA = prepareCanvas(beforeImage, width, height);
  const dataB = prepareCanvas(afterImage, width, height);
  const pixelCount = width * height;
  const cellW = Math.ceil(width / CELL_GRID);
  const cellH = Math.ceil(height / CELL_GRID);
  const cellCounts = Array.from({ length: CELL_GRID * CELL_GRID }, () => 0);

  let changed = 0;
  for (let y = 0; y < height; y++) {
    const rowA = y * width * 4;
    const ai = Math.min(heightA - 1, y) * width * 4;
    const bi = Math.min(heightB - 1, y) * width * 4;
    for (let x = 0; x < width; x++) {
      const offset = rowA + x * 4;
      const aOff = ai + x * 4;
      const bOff = bi + x * 4;
      const delta =
        Math.abs(dataA.data[aOff] - dataB.data[bOff]) +
        Math.abs(dataA.data[aOff + 1] - dataB.data[bOff + 1]) +
        Math.abs(dataA.data[aOff + 2] - dataB.data[bOff + 2]);
      if (delta / 3 > CHANNEL_THRESHOLD) {
        changed += 1;
        const cellX = Math.floor((x / width) * CELL_GRID);
        const cellY = Math.floor((y / height) * CELL_GRID);
        if (cellCounts[cellY * CELL_GRID + cellX] !== undefined) {
          cellCounts[cellY * CELL_GRID + cellX] += 1;
        }
      }
      void offset;
    }
  }

  const bulk = pixelCount > 0 ? changed / pixelCount : 0;
  const totalCells = width * height;
  const regions: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let cy = 0; cy < CELL_GRID; cy++) {
    for (let cx = 0; cx < CELL_GRID; cx++) {
      const count = cellCounts[cy * CELL_GRID + cx];
      const cellArea = cellW * (cy === CELL_GRID - 1 ? height - cy * cellH : cellH);
      if (count / Math.max(1, cellArea) >= REGION_RATIO_MIN) {
        regions.push({
          x: cx * cellW,
          y: cy * cellH,
          w: Math.min(cellW, width - cx * cellW),
          h: Math.min(cellH, height - cy * cellH),
        });
        void totalCells;
      }
    }
  }

  // Merge adjacent cells into horizontal runs for cleaner region boxes.
  const merged: typeof regions = [];
  for (const region of regions) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      Math.abs(previous.y - region.y) <= 2 &&
      region.x >= previous.x &&
      region.x <= previous.x + previous.w + cellW
    ) {
      const right = Math.max(previous.x + previous.w, region.x + region.w);
      previous.w = right - previous.x;
      previous.h = Math.max(previous.h, region.h);
    } else {
      merged.push({ ...region });
    }
  }

  // Heatmap: after-image with changed pixels painted red.
  let heatmapDataUrl: string | undefined;
  try {
    const heat = document.createElement("canvas");
    heat.width = width;
    heat.height = height;
    const heatCtx = heat.getContext("2d");
    if (heatCtx) {
      heatCtx.drawImage(afterImage, 0, 0, width, height);
      const heatData = heatCtx.getImageData(0, 0, width, height);
      for (let y = 0; y < height; y++) {
        const ai = Math.min(heightA - 1, y) * width * 4;
        const bi = Math.min(heightB - 1, y) * width * 4;
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4;
          const delta =
            Math.abs(dataA.data[ai + x * 4] - dataB.data[bi + x * 4]) +
            Math.abs(dataA.data[ai + x * 4 + 1] - dataB.data[bi + x * 4 + 1]) +
            Math.abs(dataA.data[ai + x * 4 + 2] - dataB.data[bi + x * 4 + 2]);
          if (delta / 3 > CHANNEL_THRESHOLD) {
            heatData.data[offset] = Math.min(255, 200 + (heatData.data[offset] ?? 0) / 6);
            heatData.data[offset + 1] = Math.round((heatData.data[offset + 1] ?? 0) * 0.25);
            heatData.data[offset + 2] = Math.round((heatData.data[offset + 2] ?? 0) * 0.25);
            heatData.data[offset + 3] = 255;
          }
        }
      }
      heatCtx.putImageData(heatData, 0, 0);
      heatmapDataUrl = heat.toDataURL("image/jpeg", 0.7);
      if (heatmapDataUrl.length > 900_000) heatmapDataUrl = undefined;
    }
  } catch {
    heatmapDataUrl = undefined;
  }

  return {
    ratio: Number(bulk.toFixed(4)),
    changedPixels: changed,
    regions: merged,
    heatmapDataUrl,
  };
}

/** Downscales a picked file to a JPEG data URL for AI + persistence. */
export async function screenshotToDataUrl(file: File, maxWidth = 900): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxWidth / image.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
