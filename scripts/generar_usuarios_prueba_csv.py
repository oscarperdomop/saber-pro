import argparse
import csv
from pathlib import Path


def build_rows(total: int):
    rows = []
    for idx in range(1, total + 1):
        documento = f"{1000000000 + idx}"
        rows.append(
            {
                "documento": documento,
                "tipo_documento": "CC",
                "nombres": f"USUARIO{idx}",
                "apellidos": "PEREZ",
                "correo_institucional": f"test{idx}@usco.edu.co",
                "programa": "INGENIERIA DE SOFTWARE",
                "genero": "M" if idx % 2 else "F",
                "semestre": str((idx % 10) + 1),
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Genera un CSV de usuarios de prueba con BOM UTF-8 para Excel.",
    )
    parser.add_argument(
        "--output",
        default="tmp/plantilla_usuarios_prueba.csv",
        help="Ruta del CSV de salida.",
    )
    parser.add_argument(
        "--total",
        type=int,
        default=100,
        help="Cantidad de usuarios de prueba a generar.",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    headers = [
        "documento",
        "tipo_documento",
        "nombres",
        "apellidos",
        "correo_institucional",
        "programa",
        "genero",
        "semestre",
    ]

    rows = build_rows(max(1, args.total))

    with output_path.open("w", newline="", encoding="utf-8-sig") as csv_file:
        csv_file.write("sep=;\n")
        writer = csv.DictWriter(csv_file, fieldnames=headers, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    print(f"Archivo generado: {output_path.resolve()}")
    print("Encoding usado: utf-8-sig")


if __name__ == "__main__":
    main()
