import Exceljs from 'exceljs';
import { saveAs } from 'file-saver';

export const excelDownload = (templateHeaders: string[], templateName: string) => {
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

    // 열 너비 자동 조정
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${templateName}양식.xlsx`);
  };

  return { downloadTemplate };
};
