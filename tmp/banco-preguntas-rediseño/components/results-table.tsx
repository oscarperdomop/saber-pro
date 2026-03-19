"use client"

interface ModuleResult {
  name: string
  score: number
  percentile: number
  groupPercentile: number
}

const moduleResults: ModuleResult[] = [
  { name: "Comunicación Escrita", score: 185, percentile: 92, groupPercentile: 92 },
  { name: "Razonamiento Cuantitativo", score: 171, percentile: 90, groupPercentile: 76 },
  { name: "Lectura Crítica", score: 196, percentile: 96, groupPercentile: 94 },
  { name: "Competencias Ciudadanas", score: 207, percentile: 99, groupPercentile: 98 },
  { name: "Inglés", score: 193, percentile: 88, groupPercentile: 87 },
]

function PercentileScale({ percentile, groupPercentile }: { percentile: number; groupPercentile: number }) {
  return (
    <div className="relative flex items-center w-full max-w-xs mx-auto">
      {/* Scale line */}
      <div className="relative w-full h-px bg-muted-foreground/40">
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-muted-foreground/60"
            style={{ left: `${tick}%` }}
          />
        ))}
        
        {/* Start circle marker */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-muted-foreground/60 bg-background" style={{ left: "0%" }} />
        
        {/* End label */}
        <span className="absolute -top-1 text-[10px] text-muted-foreground font-medium" style={{ left: "100%", transform: "translateX(-50%)" }}>
          100
        </span>

        {/* Group percentile marker (black triangle up) */}
        <div
          className="absolute top-1/2 -translate-x-1/2"
          style={{ left: `${groupPercentile}%` }}
        >
          <div className="relative">
            <svg width="10" height="8" viewBox="0 0 10 8" className="translate-y-0.5">
              <polygon points="5,0 10,8 0,8" fill="currentColor" className="text-foreground" />
            </svg>
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {groupPercentile}
            </span>
          </div>
        </div>

        {/* Individual percentile marker (outlined triangle down) */}
        <div
          className="absolute top-1/2 -translate-x-1/2"
          style={{ left: `${percentile}%` }}
        >
          <div className="relative">
            <svg width="10" height="8" viewBox="0 0 10 8" className="-translate-y-2.5">
              <polygon points="5,8 10,0 0,0" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
            </svg>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {percentile}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResultsTable() {
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Main title */}
      <h1 className="text-center text-2xl font-semibold text-foreground tracking-wide mb-6">
        <span className="text-primary">•</span>RESULTADOS POR MÓDULOS<span className="text-primary">•</span>
      </h1>

      {/* Table container */}
      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
        {/* Subtitle header */}
        <div className="bg-primary text-primary-foreground text-center py-3 font-semibold tracking-wide text-sm">
          MÓDULOS COMPETENCIAS GENÉRICAS
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-foreground uppercase tracking-wider w-1/4">
                Módulos
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-foreground uppercase tracking-wider w-1/4">
                Puntaje por Módulo
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-foreground uppercase tracking-wider w-1/2">
                ¿En qué percentil se encuentra?
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Subheader row */}
            <tr className="bg-muted/50 border-b border-border">
              <td className="px-4 py-2"></td>
              <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                De 300 puntos posibles, su puntaje es
              </td>
              <td className="px-4 py-2"></td>
            </tr>
            
            {/* Data rows */}
            {moduleResults.map((module, index) => (
              <tr
                key={module.name}
                className={`border-b border-border transition-colors hover:bg-secondary/50 ${
                  index % 2 === 0 ? "bg-background" : "bg-muted/30"
                }`}
              >
                <td className="px-4 py-4 text-sm text-foreground font-medium">
                  {module.name}
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-lg font-bold text-foreground">
                    {module.score}
                  </span>
                </td>
                <td className="px-4 py-6">
                  <PercentileScale
                    percentile={module.percentile}
                    groupPercentile={module.groupPercentile}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <svg width="10" height="8" viewBox="0 0 10 8">
            <polygon points="5,8 10,0 0,0" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Su percentil</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="10" height="8" viewBox="0 0 10 8">
            <polygon points="5,0 10,8 0,8" fill="currentColor" />
          </svg>
          <span>Percentil del grupo</span>
        </div>
      </div>
    </div>
  )
}
