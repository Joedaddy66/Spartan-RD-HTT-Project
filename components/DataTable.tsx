
import React from 'react';
import { CsvRow, DataTableColumn } from '../types';

interface DataTableProps {
  data: CsvRow[];
  columns: DataTableColumn[];
  caption?: string;
}

const DataTable: React.FC<DataTableProps> = ({ data, columns, caption }) => {
  if (data.length === 0) {
    return <p className="text-center text-gray-500 mt-4">No data to display.</p>;
  }

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg my-4 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        {caption && (
          <caption className="p-4 text-left text-lg font-semibold text-gray-800 bg-gray-50 rounded-t-lg">
            {caption}
          </caption>
        )}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors duration-150">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                >
                  {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
    