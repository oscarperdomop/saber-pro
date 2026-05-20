import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/osdo-/Downloads/plantilla_preguntas_generica.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table,region",
  maxChars: 12000,
  tableMaxRows: 25,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
});

console.log(summary.ndjson);
