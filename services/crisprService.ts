import { semiprimeFactors, ValueError } from './primeFactorizationService';

const BASE4: { [key: string]: number } = { "A": 0, "C": 1, "G": 2, "T": 3 };
const CODON2INT: { [key: string]: number } = {};

// Initialize CODON2INT
for (const a of "ACGT") {
  for (const b of "ACGT") {
    for (const c of "ACGT") {
      CODON2INT[a + b + c] = BASE4[a] * 16 + BASE4[b] * 4 + BASE4[c];
    }
  }
}

/**
 * Converts a 3-nucleotide codon to an integer representation.
 */
export const codonToInt = (codon: string): number => {
  codon = codon.toUpperCase();
  if (codon.length !== 3 || !/^[ACGT]+$/.test(codon)) {
    // Fix: Corrected string literal for ValueError message. Removed Python-ism '!r' and ensured message is a single string.
    throw new ValueError(`Invalid codon: "${codon}". Codon must be 3 bases long and contain only A, C, G, T.`);
  }
  return CODON2INT[codon];
};

/**
 * Calculates the lambda (λ) fingerprint score for two prime factors p and q.
 */
export const fingerprint = (p: number, q: number): number => {
  const a = (p + q) / 2;
  const m = p * q; // This is just N from semiprime_factors
  const delta = Math.abs(p - q);

  if (m === 0 || a <= 1) { // Avoid division by zero or log of non-positive number
    return 0.0;
  }

  try {
    const lam = (delta ** 2) / (m * Math.log(a));
    return lam;
  } catch (e) {
    // Math.log(a) can raise errors if a <= 0, though handled by a <= 1 check
    // Division by zero should not happen if m !== 0
    return 0.0;
  }
};

/**
 * Analyzes a DNA sequence (gRNA + PAM) and calculates a cumulative lambda score.
 *
 * @param seq The full sequence including gRNA (protospacer) and PAM.
 *            Expected format: [20bp protospacer][3bp PAM]
 * @param step The step size for codon sliding window.
 * @param pam The PAM sequence pattern (e.g., 'NGG'). 'N' matches any nucleotide.
 * @returns The cumulative lambda score for the sequence.
 */
export const analyzeSequenceForScore = (seq: string, step: number = 1, pam: string = 'NGG'): number => {
  if (seq.length < 23) { // 20bp protospacer + 3bp PAM
    return 0.0; // Sequence too short
  }

  const pamRegex = new RegExp(`^${pam.toUpperCase().replace('N', '[ACGT]')}$`);
  let totalLambda = 0.0;
  const protospacer = seq.substring(0, 20).toUpperCase();
  const pamSeqFromInput = seq.substring(20, 23).toUpperCase();

  if (!(pamSeqFromInput.length === 3 && pamRegex.test(pamSeqFromInput))) {
    return 0.0; // PAM does not match
  }

  // Ensure protospacer consists only of valid DNA bases
  if (!/^[ACGT]+$/.test(protospacer)) {
    return 0.0;
  }

  for (let i = 0; i <= protospacer.length - 6; i += step) { // Iterate through 6-base windows (two codons)
    try {
      // Extract two consecutive codons (6 bases total)
      const codon1Str = protospacer.substring(i, i + 3);
      const codon2Str = protospacer.substring(i + 3, i + 6);

      // Ensure we have full codons
      if (codon1Str.length !== 3 || codon2Str.length !== 3) {
        continue;
      }

      const c1 = codonToInt(codon1Str);
      const c2 = codonToInt(codon2Str);

      // Combine the integer representations to form N
      const N = c1 * 64 + c2; // 64 = 4^3, as each codon is 3 bases (0-63 range)

      const [p, q] = semiprimeFactors(N);
      totalLambda += fingerprint(p, q);
    } catch (e) {
      // console.error(`Skipping window due to error: ${e}`); // For debugging
      continue; // Skip windows that don't form valid semiprimes or codons
    }
  }
  return totalLambda;
};