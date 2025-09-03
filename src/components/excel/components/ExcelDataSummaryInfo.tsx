type Props = {
  totalCount: number;
  validCount: number;
  errorCount: number;
};

export const ExcelDataSummaryInfo = ({ totalCount, validCount, errorCount }: Props) => {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="text-center p-4 bg-muted rounded-lg">
        <div className="text-2xl font-bold">{totalCount}</div>
        <div className="text-sm text-muted-foreground">총 데이터</div>
      </div>
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">{validCount}</div>
        <div className="text-sm text-muted-foreground">유효한 데이터</div>
      </div>
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-600">{errorCount}</div>
        <div className="text-sm text-muted-foreground">오류 데이터</div>
      </div>
    </div>
  );
};
