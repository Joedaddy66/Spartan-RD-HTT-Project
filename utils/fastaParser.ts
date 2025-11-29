/**
 * Parses a FASTA string into an array of sequences.
 * Each sequence object will contain 'header' and 'sequence' properties.
 */
export interface FastaSequence {
  header: string;
  sequence: string;
}

export const parseFasta = (fastaString: string): FastaSequence[] => {
  const sequences: FastaSequence[] = [];
  const lines = fastaString.trim().split('\n');

  let currentSequence: FastaSequence | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('>')) {
      // New sequence header
      if (currentSequence) {
        sequences.push(currentSequence);
      }
      currentSequence = { header: trimmedLine.substring(1).trim(), sequence: '' };
    } else if (currentSequence) {
      // Sequence data
      currentSequence.sequence += trimmedLine;
    }
  }

  if (currentSequence) {
    sequences.push(currentSequence);
  }

  return sequences;
};
