
/**
 * Checks if a number is prime.
 * Optimized for numbers within the range relevant to this application (up to ~4095).
 */
export const isPrime = (num: number): boolean => {
  if (num <= 1) return false;
  if (num <= 3) return true; // 2 and 3 are prime
  if (num % 2 === 0 || num % 3 === 0) return false; // Divisible by 2 or 3

  for (let i = 5; i * i <= num; i = i + 6) {
    if (num % i === 0 || num % (i + 2) === 0) {
      return false;
    }
  }
  return true;
};

/**
 * Finds the two prime factors of a semiprime integer n.
 * A semiprime is a natural number that is the product of exactly two prime numbers.
 * The prime factors need not be distinct (e.g., 4 = 2*2 is a semiprime).
 *
 * @param n The integer to factorize. Must be a semiprime.
 * @returns A tuple [p, q] where p and q are the prime factors of n.
 * @throws ValueError if n is not a semiprime or if it's too small.
 */
export const semiprimeFactors = (n: number): [number, number] => {
  if (n <= 1) {
    throw new ValueError("Input must be greater than 1 for semiprime factorization.");
  }

  // Iterate from 2 up to sqrt(n)
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      const p = i;
      const q = n / i;

      // Check if both factors are prime
      if (isPrime(p) && isPrime(q)) {
        return [p, q];
      }
      // If we find any factor, and the remaining number is also prime,
      // it means we have found two prime factors.
      // E.g., for N=6, i=2. p=2, q=3. isPrime(2) && isPrime(3) -> true.
      // E.g., for N=4, i=2. p=2, q=2. isPrime(2) && isPrime(2) -> true.
    }
  }

  throw new ValueError(`Number ${n} is not a semiprime (product of exactly two primes).`);
};

export class ValueError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'ValueError';
  }
}
    