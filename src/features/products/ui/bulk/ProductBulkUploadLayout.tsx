import { ExcelDownloader, ExcelUploader } from '@/components/excel';
import { PRODUCT_EXCEL_TEMPLATE_DOWNLOADER, PRODUCT_EXCEL_TEMPLATE_UPLOADER } from '../../constant/Excel';

export const ProductBulkUploadLayout = () => {
  return (
    <div className="max-w-[90%] mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">상품 대량등록</h1>
        <p className="text-muted-foreground">엑셀 파일을 이용하여 여러 상품을 한번에 등록하세요.</p>
      </div>

      {/* 업로드 섹션 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 양식 다운로드 - 완 */}
        <ExcelDownloader
          excelHeader={PRODUCT_EXCEL_TEMPLATE_DOWNLOADER.excelHeader}
          isTemplateInfo={PRODUCT_EXCEL_TEMPLATE_DOWNLOADER.isTemplateInfo}
          templateInfo={PRODUCT_EXCEL_TEMPLATE_DOWNLOADER.templateInfo}
        />

        {/* 파일 업로드 - 완 */}
        <ExcelUploader
          excelHeader={PRODUCT_EXCEL_TEMPLATE_UPLOADER.excelHeader}
          contentDescription={PRODUCT_EXCEL_TEMPLATE_UPLOADER.contentDescription}
        />
      </div>

      {/* 업로드된 데이터 미리보기 */}
      {uploadedData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  3단계: 데이터 확인 및 저장
                </CardTitle>
                <CardDescription>업로드된 데이터를 확인하고 오류를 수정한 후 저장하세요.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClearData}>
                  <X className="h-4 w-4 mr-2" />
                  초기화
                </Button>
                <Button onClick={handleSaveData} disabled={validCount === 0}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  저장 ({validCount}개)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 요약 정보 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{uploadedData.length}</div>
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

            {/* 오류 알림 */}
            {errorCount > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorCount}개의 데이터에 오류가 있습니다. 오류를 수정한 후 다시 업로드하거나, 유효한 데이터만 저장할
                  수 있습니다.
                </AlertDescription>
              </Alert>
            )}

            {/* 데이터 테이블 */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">행</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>상품코드</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>가격</TableHead>
                    <TableHead>재고</TableHead>
                    <TableHead>오류 내용</TableHead>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
