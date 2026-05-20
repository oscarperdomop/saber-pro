import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/osdo-/Downloads/plantilla_preguntas_generica.xlsx";
const outputDir = "C:/Users/osdo-/Documents/Git/saber-pro/outputs/preguntas_parte2_3";
const outputPath = path.join(outputDir, "plantilla_preguntas_generica_parte2_3.xlsx");

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Plantilla Preguntas");

const modulo = "Razonamiento Cuantitativo";
const media = "Media";
const borrador = "Borrador";

const rows = [
  [modulo, "La expresión 1/2 + 1/2 equivale a:", "Álgebra", "Formulación y ejecución", "1", "1/4", "2/4", "2", media, borrador],
  [modulo, "El 20% de 50 es:", "Álgebra", "Formulación y ejecución", "10", "5", "15", "20", media, borrador],
  [modulo, "Un rectángulo tiene largo de 8 cm y ancho de 5 cm. ¿Cuál es su área?", "Geometría", "Formulación y ejecución", "40 cm²", "13 cm²", "26 cm²", "80 cm²", media, borrador],
  [modulo, "Las calificaciones de un estudiante son 4, 5 y 6. ¿Cuál es su promedio?", "Estadística", "Formulación y ejecución", "5", "4", "6", "15", media, borrador],
  [modulo, "Un banco ofrece una tasa de interés simple del 5% anual. Si se invierten $100.000 durante 1 año, ¿cuál es el interés ganado?", "Álgebra", "Formulación y ejecución", "$5.000", "$500", "$10.000", "$15.000", media, borrador],
  [modulo, "Un triángulo equilátero tiene lados de 6 cm. ¿Cuál es su perímetro?", "Geometría", "Formulación y ejecución", "18 cm", "6 cm", "12 cm", "24 cm", media, borrador],
  [modulo, "En una bolsa hay 3 bolas rojas y 2 bolas azules. Si se extrae una bola al azar, ¿cuál es la probabilidad de que sea roja?", "Estadística", "Formulación y ejecución", "3/5", "1/5", "2/5", "4/5", media, borrador],
  [modulo, "Un cubo tiene arista de 4 cm. ¿Cuál es su volumen?", "Geometría", "Formulación y ejecución", "64 cm³", "12 cm³", "16 cm³", "48 cm³", media, borrador],
  [modulo, "Las edades de un grupo de personas son: 10, 12, 15, 18 y 20 años. ¿Cuál es el rango de las edades?", "Estadística", "Formulación y ejecución", "10 años", "5 años", "8 años", "12 años", media, borrador],
  [modulo, "El resultado de 3 × (4 + 2) es:", "Álgebra", "Formulación y ejecución", "18", "10", "14", "24", media, borrador],
  [modulo, "Un círculo tiene radio de 7 cm. ¿Cuál es su circunferencia? (Usar pi ≈ 3)", "Geometría", "Formulación y ejecución", "42 cm", "21 cm", "35 cm", "49 cm", media, borrador],
  [modulo, "Sean A = {1, 2, 3} y B = {3, 4, 5}. ¿Cuál es el conjunto A ∪ B?", "Estadística", "Formulación y ejecución", "{1, 2, 3, 4, 5}", "{3}", "{1, 2, 4, 5}", "{1, 2, 3}", media, borrador],
  [modulo, "Un estudiante afirma: \"La fracción 2/4 es igual a 1/2 porque al dividir numerador y denominador entre 2 obtenemos 1/2\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es correcta; ambas fracciones representan la misma cantidad.", "Es incorrecta; 2/4 es mayor que 1/2.", "Es incorrecta; solo son iguales si el denominador es par.", "Es correcta solo para números menores que 10.", media, borrador],
  [modulo, "Un estudiante afirma: \"En un triángulo rectángulo, la hipotenusa siempre es el lado más largo\". ¿Qué se puede concluir sobre esta afirmación?", "Geometría", "Argumentación", "Es correcta; la hipotenusa es siempre mayor que cada cateto.", "Es incorrecta; la hipotenusa puede ser igual a los otros lados.", "Es incorrecta; solo es cierto para triángulos isósceles.", "Es correcta solo si los catetos son iguales.", media, borrador],
  [modulo, "Las edades de tres hermanos son 5, 7 y 9 años. Un estudiante afirma: \"El promedio de las edades es 7 años porque es el valor del medio\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es incorrecta; el promedio se calcula sumando y dividiendo entre el número de datos.", "Es correcta siempre; el promedio es siempre el valor del medio.", "Es correcta solo cuando hay tres datos.", "Es incorrecta; el promedio siempre es mayor que el valor del medio.", media, borrador],
  [modulo, "Un estudiante afirma: \"El 50% de cualquier número es siempre la mitad de ese número\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es correcta; 50% significa exactamente la mitad.", "Es incorrecta; solo es cierto para números pares.", "Es incorrecta; 50% es un cuarto del número.", "Es correcta solo para números mayores que 10.", media, borrador],
  [modulo, "Un estudiante afirma: \"Si duplico el lado de un cuadrado, su área también se duplica\". ¿Qué se puede concluir sobre esta afirmación?", "Geometría", "Argumentación", "Es incorrecta; el área se cuadruplica al duplicar el lado.", "Es correcta; el área siempre se duplica al duplicar el lado.", "Es correcta solo para cuadrados pequeños.", "Es incorrecta; el área se triplica al duplicar el lado.", media, borrador],
  [modulo, "En una moneda justa, un estudiante afirma: \"Si lanzo la moneda dos veces y obtengo cara en el primer lanzamiento, entonces en el segundo lanzamiento es más probable obtener sello\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es incorrecta; cada lanzamiento es independiente y la probabilidad sigue siendo 0.5.", "Es correcta; los lanzamientos se compensan para equilibrar resultados.", "Es correcta solo si se lanzan más de 10 veces.", "Es incorrecta; después de cara, es más probable obtener otra cara.", media, borrador],
  [modulo, "Un estudiante afirma: \"La expresión 2 + 3 × 4 es igual a 20 porque se suman primero 2 y 3, y luego se multiplica por 4\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es incorrecta; primero se multiplica y luego se suma, dando 14.", "Es correcta; siempre se realizan las operaciones de izquierda a derecha.", "Es correcta solo si hay paréntesis.", "Es incorrecta; el resultado es 24.", media, borrador],
  [modulo, "Un estudiante afirma: \"El volumen de un prisma rectangular se calcula multiplicando el área de la base por la altura\". ¿Qué se puede concluir sobre esta afirmación?", "Geometría", "Argumentación", "Es correcta; esta es la fórmula general para prismas.", "Es incorrecta; el volumen se calcula sumando las tres dimensiones.", "Es incorrecta; solo aplica a cubos.", "Es correcta solo si la base es cuadrada.", media, borrador],
  [modulo, "Un estudiante afirma: \"El rango de un conjunto de datos siempre es positivo\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es correcta; el rango es la diferencia entre el máximo y el mínimo, siempre positiva o cero.", "Es incorrecta; el rango puede ser negativo si hay números negativos.", "Es incorrecta; el rango siempre es cero.", "Es correcta solo para datos mayores que cero.", media, borrador],
  [modulo, "Un estudiante afirma: \"En la función f(x) = 3x + 2, cuando x aumenta en 1, f(x) siempre aumenta en 3\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es correcta; la pendiente es 3, por lo que el cambio en f(x) es 3 por cada unidad de x.", "Es incorrecta; f(x) aumenta en 2 cuando x aumenta en 1.", "Es incorrecta; el aumento depende del valor inicial de x.", "Es correcta solo si x es positivo.", media, borrador],
  [modulo, "Sean A = {1, 2, 3} y B = {2, 3, 4}. Un estudiante afirma: \"El conjunto A ∩ B contiene los elementos que están en A o en B\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es incorrecta; A ∩ B contiene solo los elementos comunes a A y B.", "Es correcta; la intersección incluye todos los elementos de ambos conjuntos.", "Es correcta solo si los conjuntos son iguales.", "Es incorrecta; A ∩ B está vacío.", media, borrador]
];

sheet.getRange("A2:J500").clear({ applyTo: "contents" });
sheet.getRange(`A2:J${rows.length + 1}`).values = rows;

const verify = await workbook.inspect({
  kind: "table,region",
  sheetId: "Plantilla Preguntas",
  range: `A1:J${rows.length + 1}`,
  tableMaxRows: 30,
  tableMaxCols: 10,
  maxChars: 12000
});
console.log(verify.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`SAVED:${outputPath}`);
