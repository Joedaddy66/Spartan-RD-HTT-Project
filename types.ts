

import { ReactNode } from 'react';

export interface CsvRow {
  [key: string]: string | number;
}

export interface DataTableColumn {
  key: string;
  header: string;
  render?: (value: any, row: CsvRow) => ReactNode;
  className?: string;
}