import type { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import simulacrosService from "../services/simulacrosService";
import type {
  PlantillaExamen,
  ResultadoSimulacro,
} from "../../../types/evaluaciones";

interface ApiErrorResponse {
  detail?: string;
  detalle?: string;
}

const formatFecha = (fecha: string | null): string => {
  if (!fecha) {
    return "N/A";
  }

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const ResultadosSimulacroPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery<
    ResultadoSimulacro[],
    AxiosError<ApiErrorResponse>
  >({
    queryKey: ["simulacroResultados", id],
    queryFn: () => simulacrosService.getResultadosSimulacro(String(id)),
    enabled: Boolean(id),
  });

  const { data: simulacroDetalle } = useQuery<
    PlantillaExamen,
    AxiosError<ApiErrorResponse>
  >({
    queryKey: ["simulacroDetalleResultados", id],
    queryFn: () => simulacrosService.getSimulacroById(String(id)),
    enabled: Boolean(id),
  });

  const resultados = data ?? [];

  const exportarCSV = () => {
    if (!id || resultados.length === 0) {
      return;
    }

    const cabeceras = [
      "Posicion",
      "Estudiante",
      "Programa",
      "Fecha Fin",
      "Puntaje",
    ];
    const filas = resultados.map((resultado, index) => [
      index + 1,
      `"${resultado.estudiante_nombre}"`,
      `"${resultado.programa_nombre}"`,
      formatFecha(resultado.fecha_fin),
      resultado.puntaje_global,
    ]);

    const csv = [
      cabeceras.join(","),
      ...filas.map((fila) => fila.join(",")),
    ].join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Resultados_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!id) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        No se encontro el simulacro solicitado.
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-xl border border-usco-ocre/80 bg-white p-6 text-usco-gris shadow-sm">
        Cargando ranking del simulacro...
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        {error.response?.data?.detail ??
          error.response?.data?.detalle ??
          "No fue posible cargar los resultados del simulacro."}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold uppercase text-usco-vino">
          RESULTADOS
        </h1>
        <p className="text-sm text-usco-gris">
          {simulacroDetalle?.titulo ?? "Simulacro"}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={exportarCSV}
          disabled={resultados.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Exportar a CSV
        </button>

        <button
          type="button"
          onClick={() => navigate("/simulacros")}
          className="inline-flex items-center gap-2 rounded-lg border border-usco-gris/30 bg-white px-4 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-usco-ocre/80 bg-white shadow-md">
        <table className="w-full min-w-[780px]">
          <thead className="bg-usco-fondo">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Posicion
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Estudiante
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Programa
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-usco-gris">
                Fecha Finalizacion
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-usco-gris">
                Puntaje Global
              </th>
            </tr>
          </thead>
          <tbody>
            {resultados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-usco-gris">
                  No hay intentos finalizados para este simulacro.
                </td>
              </tr>
            ) : (
              resultados.map((resultado, index) => (
                <tr
                  key={`${resultado.estudiante_nombre}-${index}`}
                  className={index % 2 === 0 ? "bg-white" : "bg-usco-fondo/40"}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-usco-gris">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-usco-gris">
                    {resultado.estudiante_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-usco-gris">
                    {resultado.programa_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-usco-gris">
                    {formatFecha(resultado.fecha_fin)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-usco-vino">
                    {resultado.puntaje_global}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ResultadosSimulacroPage;
