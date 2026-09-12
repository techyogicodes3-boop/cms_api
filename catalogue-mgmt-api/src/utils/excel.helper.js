const ExcelJS = require("exceljs");

function safeSheetName(value) {
  return String(value || "Report").replace(/[\\/*?:[\]]/g, "-").slice(0, 31) || "Report";
}

function displayLength(value) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return 19;
  return String(value).length;
}

exports.createExcelWorkbook = async (sheetName, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Chocotraill";
  workbook.company = "Chocotraill";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(safeSheetName(sheetName), {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 20 },
  });

  worksheet.columns = columns.map((column, index) => ({
    header: column.label,
    key: `column_${index}`,
    width: column.width || Math.min(45, Math.max(12, column.label.length + 2)),
    style: column.numFmt ? { numFmt: column.numFmt } : undefined,
  }));

  rows.forEach((row) => {
    const values = columns.map((column) => {
      const value = column.value(row);
      return value === null || value === undefined ? "" : value;
    });
    worksheet.addRow(values);
  });

  const header = worksheet.getRow(1);
  header.height = 26;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A2318" } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  for (let index = 1; index <= columns.length; index += 1) {
    const column = worksheet.getColumn(index);
    const configured = columns[index - 1];
    let width = configured.width || displayLength(configured.label) + 2;
    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) width = Math.max(width, displayLength(cell.value) + 2);
      cell.alignment = {
        vertical: "top",
        horizontal: configured.align || (configured.numFmt ? "right" : "left"),
        wrapText: true,
      };
    });
    column.width = Math.min(configured.maxWidth || 45, Math.max(configured.minWidth || 12, width));
  }

  if (columns.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
};
