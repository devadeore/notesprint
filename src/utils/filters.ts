export const applyFilters = (
  canvas: HTMLCanvasElement,
  filters: {
    invert: boolean;
    grayscale: boolean;
    cleanBackground: boolean;
    blackAndWhite: boolean;
    brightness: number;
    contrast: number;
  }
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Contrast factor
  const factor = (259 * (filters.contrast + 255)) / (255 * (259 - filters.contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Grayscale
    if (filters.grayscale || filters.cleanBackground || filters.blackAndWhite) {
      const avg = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = g = b = avg;
    }

    // 2. Brightness
    r += filters.brightness;
    g += filters.brightness;
    b += filters.brightness;

    // 3. Contrast
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;

    // 4. Invert
    if (filters.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // 5. Smart Clean Background (Thresholding)
    if (filters.cleanBackground) {
      const threshold = 180; // Detect light-grey backgrounds
      if (r > threshold && g > threshold && b > threshold) {
        r = g = b = 255;
      } else if (r < 50) { // Enhance text
        r = g = b = 0;
      }
    }

    // 6. Black and White (Hard Threshold)
    if (filters.blackAndWhite) {
      const threshold = 128;
      const val = (r + g + b) / 3 > threshold ? 255 : 0;
      r = g = b = val;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(imageData, 0, 0);
};
