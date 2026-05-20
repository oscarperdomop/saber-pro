import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputPath = "C:/Users/osdo-/Documents/Git/saber-pro/outputs/preguntas_parte2_3/plantilla_preguntas_generica_parte2_3.xlsx";
const downloadPath = "C:/Users/osdo-/Downloads/plantilla_preguntas_generica_parte2_3.xlsx";

const input = await FileBlob.load(outputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Plantilla Preguntas");

const modulo = "Razonamiento Cuantitativo";
const dificultad = "Facil";
const estado = "Borrador";

const rows = [
  [modulo, "La expresión $\\dfrac{1}{2} + \\dfrac{1}{2}$ equivale a:", "Álgebra", "Formulación y ejecución", "$1$", "$\\dfrac{1}{4}$", "$\\dfrac{2}{4}$", "$2$", dificultad, estado],
  [modulo, "El $20\\%$ de $50$ es:", "Álgebra", "Formulación y ejecución", "$10$", "$5$", "$15$", "$20$", dificultad, estado],
  [modulo, "Un rectángulo tiene largo de $8\\,\\text{cm}$ y ancho de $5\\,\\text{cm}$. ¿Cuál es su área?", "Geometría", "Formulación y ejecución", "$40\\,\\text{cm}^2$", "$13\\,\\text{cm}^2$", "$26\\,\\text{cm}^2$", "$80\\,\\text{cm}^2$", dificultad, estado],
  [modulo, "Las calificaciones de un estudiante son $4$, $5$ y $6$. ¿Cuál es su promedio?", "Estadística", "Formulación y ejecución", "$5$", "$4$", "$6$", "$15$", dificultad, estado],
  [modulo, "Un banco ofrece una tasa de interés simple del $5\\%$ anual. Si se invierten \\$100.000 durante $1$ año, ¿cuál es el interés ganado?", "Álgebra", "Formulación y ejecución", "\\$5.000", "\\$500", "\\$10.000", "\\$15.000", dificultad, estado],
  [modulo, "Un triángulo equilátero tiene lados de $6\\,\\text{cm}$. ¿Cuál es su perímetro?", "Geometría", "Formulación y ejecución", "$18\\,\\text{cm}$", "$6\\,\\text{cm}$", "$12\\,\\text{cm}$", "$24\\,\\text{cm}$", dificultad, estado],
  [modulo, "En una bolsa hay $3$ bolas rojas y $2$ bolas azules. Si se extrae una bola al azar, ¿cuál es la probabilidad de que sea roja?", "Estadística", "Formulación y ejecución", "$\\dfrac{3}{5}$", "$\\dfrac{1}{5}$", "$\\dfrac{2}{5}$", "$\\dfrac{4}{5}$", dificultad, estado],
  [modulo, "Un cubo tiene arista de $4\\,\\text{cm}$. ¿Cuál es su volumen?", "Geometría", "Formulación y ejecución", "$64\\,\\text{cm}^3$", "$12\\,\\text{cm}^3$", "$16\\,\\text{cm}^3$", "$48\\,\\text{cm}^3$", dificultad, estado],
  [modulo, "Las edades de un grupo de personas son: $10$, $12$, $15$, $18$ y $20$ años. ¿Cuál es el rango de las edades?", "Estadística", "Formulación y ejecución", "$10$ años", "$5$ años", "$8$ años", "$12$ años", dificultad, estado],
  [modulo, "El resultado de $3 \\times (4 + 2)$ es:", "Álgebra", "Formulación y ejecución", "$18$", "$10$", "$14$", "$24$", dificultad, estado],
  [modulo, "Un círculo tiene radio de $7\\,\\text{cm}$. ¿Cuál es su circunferencia? (Usar $\\pi \\approx 3$)", "Geometría", "Formulación y ejecución", "$42\\,\\text{cm}$", "$21\\,\\text{cm}$", "$35\\,\\text{cm}$", "$49\\,\\text{cm}$", dificultad, estado],
  [modulo, "Sean $A = \\{1, 2, 3\\}$ y $B = \\{3, 4, 5\\}$. ¿Cuál es el conjunto $A \\cup B$?", "Estadística", "Formulación y ejecución", "$\\{1, 2, 3, 4, 5\\}$", "$\\{3\\}$", "$\\{1, 2, 4, 5\\}$", "$\\{1, 2, 3\\}$", dificultad, estado],
  [modulo, "Un estudiante afirma: \"La fracción $\\dfrac{2}{4}$ es igual a $\\dfrac{1}{2}$ porque al dividir numerador y denominador entre $2$ obtenemos $\\dfrac{1}{2}$\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es correcta; ambas fracciones representan la misma cantidad.", "Es incorrecta; $\\dfrac{2}{4}$ es mayor que $\\dfrac{1}{2}$.", "Es incorrecta; solo son iguales si el denominador es par.", "Es correcta solo para números menores que $10$.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"En un triángulo rectángulo, la hipotenusa siempre es el lado más largo\". ¿Qué se puede concluir sobre esta afirmación?", "Geometría", "Argumentación", "Es correcta; la hipotenusa es siempre mayor que cada cateto.", "Es incorrecta; la hipotenusa puede ser igual a los otros lados.", "Es incorrecta; solo es cierto para triángulos isósceles.", "Es correcta solo si los catetos son iguales.", dificultad, estado],
  [modulo, "Las edades de tres hermanos son $5$, $7$ y $9$ años. Un estudiante afirma: \"El promedio de las edades es $7$ años porque es el valor del medio\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es incorrecta; el promedio se calcula sumando y dividiendo entre el número de datos.", "Es correcta siempre; el promedio es siempre el valor del medio.", "Es correcta solo cuando hay tres datos.", "Es incorrecta; el promedio siempre es mayor que el valor del medio.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"El $50\\%$ de cualquier número es siempre la mitad de ese número\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es correcta; $50\\%$ significa exactamente la mitad.", "Es incorrecta; solo es cierto para números pares.", "Es incorrecta; $50\\%$ es un cuarto del número.", "Es correcta solo para números mayores que $10$.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"Si duplico el lado de un cuadrado, su área también se duplica\". ¿Qué se puede concluir sobre esta afirmación?", "Geometría", "Argumentación", "Es incorrecta; el área se cuadruplica al duplicar el lado.", "Es correcta; el área siempre se duplica al duplicar el lado.", "Es correcta solo para cuadrados pequeños.", "Es incorrecta; el área se triplica al duplicar el lado.", dificultad, estado],
  [modulo, "En una moneda justa, un estudiante afirma: \"Si lanzo la moneda dos veces y obtengo cara en el primer lanzamiento, entonces en el segundo lanzamiento es más probable obtener sello\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es incorrecta; cada lanzamiento es independiente y la probabilidad sigue siendo $0.5$.", "Es correcta; los lanzamientos se compensan para equilibrar resultados.", "Es correcta solo si se lanzan más de $10$ veces.", "Es incorrecta; después de cara, es más probable obtener otra cara.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"La expresión $2 + 3 \\times 4$ es igual a $20$ porque se suman primero $2$ y $3$, y luego se multiplica por $4$\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es incorrecta; primero se multiplica y luego se suma, dando $14$.", "Es correcta; siempre se realizan las operaciones de izquierda a derecha.", "Es correcta solo si hay paréntesis.", "Es incorrecta; el resultado es $24$.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"El volumen de un prisma rectangular se calcula multiplicando el área de la base por la altura\". ¿Qué se puede concluir sobre esta afirmación?", "Geometría", "Argumentación", "Es correcta; esta es la fórmula general para prismas.", "Es incorrecta; el volumen se calcula sumando las tres dimensiones.", "Es incorrecta; solo aplica a cubos.", "Es correcta solo si la base es cuadrada.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"El rango de un conjunto de datos siempre es positivo\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es correcta; el rango es la diferencia entre el máximo y el mínimo, siempre positiva o cero.", "Es incorrecta; el rango puede ser negativo si hay números negativos.", "Es incorrecta; el rango siempre es cero.", "Es correcta solo para datos mayores que cero.", dificultad, estado],
  [modulo, "Un estudiante afirma: \"En la función $f(x) = 3x + 2$, cuando $x$ aumenta en $1$, $f(x)$ siempre aumenta en $3$\". ¿Qué se puede concluir sobre esta afirmación?", "Álgebra", "Argumentación", "Es correcta; la pendiente es $3$, por lo que el cambio en $f(x)$ es $3$ por cada unidad de $x$.", "Es incorrecta; $f(x)$ aumenta en $2$ cuando $x$ aumenta en $1$.", "Es incorrecta; el aumento depende del valor inicial de $x$.", "Es correcta solo si $x$ es positivo.", dificultad, estado],
  [modulo, "Sean $A = \\{1, 2, 3\\}$ y $B = \\{2, 3, 4\\}$. Un estudiante afirma: \"El conjunto $A \\cap B$ contiene los elementos que están en $A$ o en $B$\". ¿Qué se puede concluir sobre esta afirmación?", "Estadística", "Argumentación", "Es incorrecta; $A \\cap B$ contiene solo los elementos comunes a $A$ y $B$.", "Es correcta; la intersección incluye todos los elementos de ambos conjuntos.", "Es correcta solo si los conjuntos son iguales.", "Es incorrecta; $A \\cap B$ está vacío.", dificultad, estado]
];

sheet.getRange("A2:J500").clear({ applyTo: "contents" });
sheet.getRange(`A2:J${rows.length + 1}`).values = rows;

const check = await workbook.inspect({
  kind: "table",
  range: "A1:J24",
  tableMaxRows: 24,
  tableMaxCols: 10,
  maxChars: 10000
});
console.log(check.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await output.save(downloadPath);

console.log(`UPDATED:${outputPath}`);
console.log(`UPDATED:${downloadPath}`);

