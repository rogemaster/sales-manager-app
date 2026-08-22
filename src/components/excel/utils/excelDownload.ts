import Exceljs from 'exceljs';
import { saveAs } from 'file-saver';

export const excelDownload = (templateHeaders: string[], templateName: string, numericColumns: string[] = []) => {
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

    // 열 너비 조정 + 서식 지정
    //
    // 서식은 도메인 타입을 따른다 — number 필드(판매가·배송비 등)는 숫자 서식, 나머지는 텍스트다.
    // 텍스트가 기본인 이유는 일반 서식 칸에서 Excel이 값을 변형하기 때문이다. '90,100,110'은
    // 콤마가 천 단위 구분자로 읽혀 90100110 하나가 되고 '007'은 7이 된다. 파일이 우리에게 올 때
    // 이미 병합된 뒤라 복구할 수 없다. 새 컬럼에 플래그를 빠뜨려도 텍스트로 떨어지는 쪽이 안전하다.
    templateHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = 15;

      if (!numericColumns.includes(header)) {
        column.numFmt = '@';
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${templateName}양식.xlsx`);
  };

  return { downloadTemplate };
};
