
import { CsvRow } from '../types';

/**
 * Parses a CSV string into an array of objects.
 * Assumes the first row is the header.
 */
export const parseCSV = (csvString: string): CsvRow[] => {
  const lines = csvString.trim().split('\n');
  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map(header => header.trim());
  const data: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());
    if (values.length !== headers.length) {
      // Skip malformed rows or warn
      console.warn(`Skipping malformed CSV row: ${lines[i]}`);
      continue;
    }
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  return data;
};

/**
 * Unparses an array of objects into a CSV string.
 * Uses the keys of the first object as headers.
 */
export const unparseCSV = (data: CsvRow[]): string => {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const headerLine = headers.join(',');

  const dataLines = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        // Enclose in double quotes and escape existing double quotes
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
};
    