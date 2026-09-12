function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cell(value, header = false) {
  const style = header ? ' ss:StyleID="Header"' : "";
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const type = isNumber ? "Number" : "String";
  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

exports.createExcelWorkbook = (sheetName, columns, rows) => {
  const header = `<Row>${columns.map((column) => cell(column.label, true)).join("")}</Row>`;
  const body = rows.map((row) => (
    `<Row>${columns.map((column) => cell(column.value(row))).join("")}</Row>`
  )).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#F6ECDD" ss:Pattern="Solid"/></Style></Styles>
 <Worksheet ss:Name="${escapeXml(sheetName).slice(0, 31)}"><Table>${header}${body}</Table></Worksheet>
</Workbook>`;
};
