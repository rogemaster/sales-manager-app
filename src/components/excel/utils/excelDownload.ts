import Exceljs from 'exceljs';
import { saveAs } from 'file-saver';

export const excelDownload = (templateHeaders: string[], templateName: string, textColumns: string[] = []) => {
  const downloadTemplate = async () => {
    const workbook = new Exceljs.Workbook();
    const worksheet = workbook.addWorksheet(templateName);

    // 헤더를 추가 (각 헤더를 개별 행으로 추가)
    worksheet.addRow(templateHeaders);

    // 헤더 행 스타일링
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF00' },
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
      };
    });

    // 열 너비 조정 + 텍스트 서식 지정
    //
    // 숫자로만 이뤄진 값을 일반 서식 칸에 적으면 Excel이 변형한다 — '90,100,110'은 콤마를
    // 천 단위 구분자로 읽혀 90100110 하나가 되고, '007'은 7이 된다. 파일이 우리에게 올 때
    // 이미 병합된 뒤라 코드로는 복구할 수 없으므로, 양식 단계에서 텍스트 서식으로 막는다.
    templateHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = 15;

      if (textColumns.includes(header)) {
        column.numFmt = '@';
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${templateName}양식.xlsx`);
  };

  return { downloadTemplate };
};
