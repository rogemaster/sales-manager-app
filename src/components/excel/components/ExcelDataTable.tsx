import React from 'react';
import { ExcelRowWithErrors, ExcelTableColumnsType } from '@/types/excel.type';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Props = { uploadedData: ExcelRowWithErrors[]; tableColumns: ExcelTableColumnsType[] };

const ExcelDataTableInner = ({ tableColumns, uploadedData }: Props) => {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
            {tableColumns.map((header) => (
              <TableHead key={header.key} className="text-center font-bold uppercase tracking-widest">
                {header.headerTitle}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploadedData.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={
                Array.isArray(row.error) && row.error.length > 0
                  ? 'border-b border-border/70 transition-colors last:border-0 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50'
                  : 'border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30'
              }
            >
              {tableColumns.map((column) => (
                <TableCell key={column.key} className={cn('text-center', column.cellClassName)}>
                  {column.accessor(row, rowIndex)}
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
