interface SaberProLoaderProps {
  mensaje?: string
}

export const SaberProLoader = ({ mensaje = 'Procesando...' }: SaberProLoaderProps) => {
  return (
    <div className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-usco-ocre/70 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-usco-vino">Saber Pro USCO</p>
      <p className="text-sm font-semibold tracking-wide text-usco-gris">{mensaje}</p>
    </div>
  )
}

export default SaberProLoader
