import { ExcelPreviewDataTableProps } from '@/types/ExcelInterface';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const ExcelDataTable = ({ uploadedData, tableHeaders }: ExcelPreviewDataTableProps) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {tableHeaders.map((header) => (
              <TableHead key={header.key}>{header.headerTitle}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploadedData.map((item, index) => (
            <TableRow key={index} className={item.status === 'error' ? 'bg-red-50' : ''}>
              <TableCell>{item.row}</TableCell>
              <TableCell>
                {item.status === 'valid' ? (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    정상
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    오류
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">{item.code || '-'}</TableCell>
              <TableCell>{item.name || '-'}</TableCell>
              <TableCell>{item.category || '-'}</TableCell>
              <TableCell>{item.price ? `${item.price.toLocaleString()}원` : '-'}</TableCell>
              <TableCell>{item.stock || '-'}</TableCell>
              <TableCell>
                {item.errors.length > 0 && (
                  <div className="text-sm text-red-600">
                    {item.errors.map((error, idx) => (
                      <div key={idx}>• {error}</div>
                    ))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
