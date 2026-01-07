import Tesseract from 'tesseract.js';

export interface ExtractedBet {
  number: string;
  amount: number;
  original: string;
  isPermutation: boolean;
}

// Lightweight client-side OCR without server/API keys
// Basic preprocessing: center crop + grayscale + global threshold
async function preprocessBase64(base64Image: string): Promise<string> {
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dataUrl;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  // Center ROI: 80% width, 60% height
  const roiW = Math.floor(w * 0.8);
  const roiH = Math.floor(h * 0.6);
  const sx = Math.floor((w - roiW) / 2);
  const sy = Math.floor((h - roiH) / 2);

  canvas.width = roiW;
  canvas.height = roiH;
  ctx.drawImage(img, sx, sy, roiW, roiH, 0, 0, roiW, roiH);

  const imageData = ctx.getImageData(0, 0, roiW, roiH);
  const d = imageData.data;

  // Grayscale + compute mean
  let sum = 0;
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    d[p] = d[p + 1] = d[p + 2] = y;
    sum += y;
  }
  const mean = sum / (d.length / 4);
  const threshold = Math.max(90, Math.min(200, mean * 0.9));

  // Global threshold
  for (let p = 0; p < d.length; p += 4) {
    const y = d[p];
    const v = y > threshold ? 255 : 0;
    d[p] = d[p + 1] = d[p + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  // Return processed PNG for lossless text edges
  return canvas.toDataURL('image/png');
}

export const extractBetsFromImage = async (base64Image: string): Promise<ExtractedBet[]> => {
  const processedUrl = await preprocessBase64(base64Image);

  const { data } = await Tesseract.recognize(processedUrl, 'eng', {
    tessedit_char_whitelist: '0123456789Rr-/.@ ',
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  } as any);

  const rawText = (data?.text || '').replace(/[,]/g, '');

  // Normalize OCR quirks
  const norm = rawText
    .replace(/[Oo]/g, '0')
    .replace(/[Il]/g, '1')
    .replace(/[Ss]/g, '5');

  const bets: ExtractedBet[] = [];

  // Patterns:
  // 1) 123R1000 | 123R 1000 | 123 R1000
  // 2) 123-500 | 123/500 | 123@500 | 123.500 | 123 500
  const regex = /(?:^|\s)(\d{3})\s*(?:([Rr])\s*)?(?:[-/.@]?\s*)?(\d{2,7})(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(norm)) !== null) {
    const num = (m[1] || '').slice(0, 3);
    const isPerm = !!m[2];
    const amt = parseInt(m[3] || '0', 10);
    if (!/\d{3}/.test(num) || !Number.isFinite(amt) || amt <= 0) continue;

    bets.push({
      number: num,
      amount: amt,
      original: `${num}${isPerm ? 'R' : '-'}${amt}`,
      isPermutation: isPerm,
    });
  }

  return bets;
};