import { ExcelPreviewDataTableProps } from '@/types/ExcelInterface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import React from 'react';

type Props<T = Record<string, unknown>> = { uploadedData: T[] };

const ExcelDataTableInner = <T extends Record<string, unknown>>({
  tableColumns,
  uploadedData,
  getRowKey,
  getRowClassName,
}: ExcelPreviewDataTableProps<T> & Props<T>) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {tableColumns.map((header) => (
              <TableHead key={header.key}>{header.headerTitle}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploadedData.map((row, index) => (
            <TableRow key={getRowKey?.(row, index) ?? index} className={getRowClassName?.(row)}>
              {tableColumns.map((column) => (
                <TableCell key={column.key} className={column.cellClassName}>
                  {column.accessor(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const ExcelDataTable = React.memo(ExcelDataTableInner) as typeof ExcelDataTableInner;
