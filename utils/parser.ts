
/**
 * Generates all unique permutations of a 3-digit string.
 */
export const getPermutations = (str: string): string[] => {
  if (str.length !== 3) return [str];
  const results = new Set<string>();

  const permute = (arr: string[], m: string[] = []) => {
    if (arr.length === 0) {
      results.add(m.join(''));
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr.slice(), m.concat(next));
      }
    }
  };

  permute(str.split(''));
  return Array.from(results);
};

/**
 * Smart Parser: Handles 123-500, 456R1000, 456R-1000, 789/200
 */
export const parseBulkInput = (input: string): { number: string; amount: number; original: string; isPermutation: boolean }[] => {
  const bets: { number: string; amount: number; original: string; isPermutation: boolean }[] = [];
  
  // Updated Regex: 
  // (\d{3}) -> 3 digits
  // (?:([Rr])[-/]?|[-/]) -> Either 'R' with optional separator, OR just a separator
  // (\d+) -> Amount
  const regex = /(\d{3})(?:([Rr])[-/]?|[-/])(\d+)/g;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const num = match[1];
    const isPermutation = !!match[2];
    const amount = parseInt(match[3], 10);
    const original = match[0];

    if (isPermutation) {
      const perms = getPermutations(num);
      perms.forEach(p => {
        bets.push({ number: p, amount: amount, original, isPermutation: true });
      });
    } else {
      bets.push({ number: num, amount: amount, original, isPermutation: false });
    }
  }

  return bets;
};

/**
 * Cleaning function for OCR results
 */
export const cleanOcrText = (text: string): string => {
  return text
    .replace(/[Il]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/[sS]/g, '5')
    .replace(/[bB]/g, '8')
    .replace(/[^0-9Rr\-/,\s\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Voice text to standard format
 */
export const voiceToFormat = (text: string): string => {
  const map: Record<string, string> = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 
    'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'hundred': '00', 'thousand': '000'
  };

  let processed = text.toLowerCase();
  Object.keys(map).forEach(key => {
    processed = processed.replace(new RegExp(key, 'g'), map[key]);
  });

  return processed.replace(/\s+/g, '').replace(/(\d{3})(\d+)/, '$1R$2');
};
