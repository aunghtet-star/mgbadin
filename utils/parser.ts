
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
 * Smart Parser: Handles a wide variety of shorthand notations.
 * Supports: 123-1000, 123R1000, 123 R 1000, 123@1000, 123*1000, 123 1000, etc.
 */
export const parseBulkInput = (input: string): { number: string; amount: number; original: string; isPermutation: boolean }[] => {
  const bets: { number: string; amount: number; original: string; isPermutation: boolean }[] = [];
  
  /**
   * REGEX BREAKDOWN:
   * (\d{3})                -> Capture exactly 3 digits (The number)
   * \s*                    -> Optional whitespace
   * (?:                    -> Start non-capturing group for separator logic
   *   ([Rr])\s*[@=*\.,\/\-\s]? -> OR: Capture 'R' or 'r' (Permutation) followed by optional punctuation/space
   *   |                      -> OR
   *   [@=*\.,\/\-\s]         -> Just a single punctuation or space separator (Direct bet)
   * )
   * \s*                    -> Optional whitespace
   * (\d+)                  -> Capture 1 or more digits (The amount)
   */
  const regex = /(\d{3})\s*(?:([Rr])\s*[@=*\.,\/\-\s]?|[@=*\.,\/\-\s])\s*(\d+)/g;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const num = match[1];
    const isPermutation = !!match[2]; // If group 2 caught R/r
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
 * Updated to preserve characters used as separators in the new syntax.
 */
export const cleanOcrText = (text: string): string => {
  return text
    .replace(/[Il]/g, '1')
    .replace(/[oO]/g, '0')
    .replace(/[sS]/g, '5')
    .replace(/[bB]/g, '8')
    // Preserve numbers, R, r, and the set of valid separators: @, =, *, ., ,, /, -, spaces
    .replace(/[^0-9Rr\s\n@=*\.,\/\-]/g, '')
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
