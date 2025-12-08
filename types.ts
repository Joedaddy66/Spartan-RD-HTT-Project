import { ReactNode } from 'react';

export interface CsvRow {
  [key: string]: string | number | boolean | { N: number, p: number, q: number, additive_complexity: number, multiplicative_resistance: number }[] | undefined;
  factorization_details?: { N: number, p: number, q: number, additive_complexity: number, multiplicative_resistance: number }[];
  specificity_score?: number; // Added for specificity analysis
}

export interface SimulatedReadResult extends CsvRow {
  sequence: string;
  source: string;
  lambda_score: number;
  classification: string;
  is_correct: boolean;
}

export interface DataTableColumn {
  key: string;
  header: string;
  render?: (value: any, row: CsvRow) => ReactNode;
  className?: string;
}