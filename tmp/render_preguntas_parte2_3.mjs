import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const xlsxPath = "C:/Users/osdo-/Documents/Git/saber-pro/outputs/preguntas_parte2_3/plantilla_preguntas_generica_parte2_3.xlsx";
const pngPath = "C:/Users/osdo-/Documents/Git/saber-pro/outputs/preguntas_parte2_3/preview_plantilla_preguntas_generica_parte2_3.png";

const input = await FileBlob.load(xlsxPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const preview = await workbook.render({
  sheetName: "Plantilla Preguntas",
  autoCrop: "all",
  scale: 1,
  format: "png"
});

await fs.writeFile(pngPath, new Uint8Array(await preview.arrayBuffer()));
console.log(`RENDERED:${pngPath}`);
