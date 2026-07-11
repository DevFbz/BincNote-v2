/**
 * Render an emoji character onto a favicon-sized canvas
 * and return a data URL suitable for <link rel="icon">.
 */
export function emojiToFavicon(
  emoji: string,
  size: number = 32
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, size, size);

  // Use a large font so the emoji fills the canvas
  const fontSize = Math.round(size * 0.75);
  ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 2);

  return canvas.toDataURL("image/png");
}

/**
 * Set or update the browser's favicon <link> tag.
 */
export function setFavicon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.href = url;
}
