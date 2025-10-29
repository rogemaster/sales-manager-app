import React from 'react';
import { ExcelRowWithErrors, ExcelTableColumnsType } from '@/types/excel.type';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = { uploadedData: ExcelRowWithErrors[]; tableColumns: ExcelTableColumnsType[] };

const ExcelDataTableInner = ({ tableColumns, uploadedData }: Props) => {
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
          {uploadedData.map((row, rowIndex) => (
            <TableRow key={rowIndex} className={Array.isArray(row.error) && row.error.length > 0 ? 'bg-red-50' : ''}>
              {tableColumns.map((column, colIndex) => (
                <TableCell key={column.key} className={column.cellClassName}>
                  {column.accessor(row, colIndex)}
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
