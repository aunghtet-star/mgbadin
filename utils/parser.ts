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
 * Supports standard: 123-1000, 123R1000
 * Supports compound: 123R1000-10000 (Direct 123 @ 10000, Others @ 1000)
 * Supports compound: 123-10000R1000 (Direct 123 @ 10000, Others @ 1000)
 */
export const parseBulkInput = (input: string): { number: string; amount: number; original: string; isPermutation: boolean }[] => {
  const bets: { number: string; amount: number; original: string; isPermutation: boolean }[] = [];

  // Create a working copy of the input that we can mask
  let workingInput = input;

  // 1. COMPOUND PATTERN: [Number]R[RemAmount]-[DirAmount] 
  // Example: 123R1000-10000
  const compoundRegex1 = /(\d{3})[Rr](\d+)[-=@*](\d+)/g;
  let match;
  while ((match = compoundRegex1.exec(workingInput)) !== null) {
    const num = match[1];
    const rAmount = parseInt(match[2], 10);
    const dAmount = parseInt(match[3], 10);
    const original = match[0];

    // Push direct number with its specific amount
    bets.push({ number: num, amount: dAmount, original, isPermutation: false });

    // Push other permutations with the "R" amount
    const perms = getPermutations(num).filter(p => p !== num);
    perms.forEach(p => {
      bets.push({ number: p, amount: rAmount, original, isPermutation: true });
    });

    // Mask this part of the string so standard regexes don't double-count it
    workingInput = workingInput.substring(0, match.index) + ' '.repeat(original.length) + workingInput.substring(match.index + original.length);
  }

  // 2. COMPOUND PATTERN: [Number]-[DirAmount]R[RemAmount]
  // Example: 123-10000R1000
  const compoundRegex2 = /(\d{3})[-=@*](\d+)[Rr](\d+)/g;
  while ((match = compoundRegex2.exec(workingInput)) !== null) {
    const num = match[1];
    const dAmount = parseInt(match[2], 10);
    const rAmount = parseInt(match[3], 10);
    const original = match[0];

    // Push direct
    bets.push({ number: num, amount: dAmount, original, isPermutation: false });

    // Push remaining
    const perms = getPermutations(num).filter(p => p !== num);
    perms.forEach(p => {
      bets.push({ number: p, amount: rAmount, original, isPermutation: true });
    });

    workingInput = workingInput.substring(0, match.index) + ' '.repeat(original.length) + workingInput.substring(match.index + original.length);
  }

  // 3. STANDARD PATTERN: 123-1000, 123R1000, 123@1000 etc.
  // Using a robust regex for common delimiters
  // Note: @ is treated like R (permutation)
  const standardRegex = /(\d{3})\s*(?:([Rr@])\s*[=*\.,\/\-\s]?|[=*\.,\/\-\s])\s*(\d+)/g;
  while ((match = standardRegex.exec(workingInput)) !== null) {
    const num = match[1];
    const isPermutation = !!match[2] && (match[2].toLowerCase() === 'r' || match[2] === '@');
    const amount = parseInt(match[3], 10);
    const original = match[0].trim();

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