/**
 * A small tileable grayscale noise texture, generated once and cached, for
 * the background "grain" overlay and the glass "acrylic" surface texture.
 */

const SIZE = 128;
let cached: string | null = null;

/** A `data:` URL of a `SIZE`×`SIZE` random grayscale PNG, generated once. */
export function noiseTextureDataUrl(): string {
  if (cached) {
    return cached;
  }
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cached = '';
    return cached;
  }
  const image = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  cached = canvas.toDataURL('image/png');
  return cached;
}
