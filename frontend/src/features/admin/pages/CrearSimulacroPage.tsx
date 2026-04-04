import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import preguntasService from '../services/preguntasService'
import simulacrosService from '../services/simulacrosService'
import usuariosService from '../services/usuariosService'
import type { Programa } from '../../../types/evaluaciones'
import type { Modulo } from '../../../types/preguntas'

interface ApiErrorResponse {
  detail?: string
  detalle?: string
  [key: string]: unknown
}

interface ReglaSimulacro {
  modulo_id: number | ''
  cantidad_facil: number
  cantidad_media: number
  cantidad_alta: number
  distribucion_automatica: boolean
  total_preguntas: number
}

const toIsoString = (dateTimeLocalValue: string): string => {
  return new Date(dateTimeLocalValue).toISOString()
}

const CrearSimulacroPage = () => {
  const navigate = useNavigate()

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tiempoMinutos, setTiempoMinutos] = useState(120)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [mostrarResultadosInmediatos, setMostrarResultadosInmediatos] = useState(true)
  const [activo, setActivo] = useState(true)
  const [esParaTodos, setEsParaTodos] = useState(true)
  const [programaSeleccionado, setProgramaSeleccionado] = useState<number | ''>('')
  const [reglas, setReglas] = useState<ReglaSimulacro[]>([])
  const [formError, setFormError] = useState('')

  const {
    data: modulos = [],
    isLoading: isLoadingModulos,
    isError: isErrorModulos,
    error: modulosError,
  } = useQuery<Modulo[], AxiosError<ApiErrorResponse>>({
    queryKey: ['modulos'],
    queryFn: preguntasService.getModulos,
  })

  const {
    data: programas = [],
    isLoading: isLoadingProgramas,
    isError: isErrorProgramas,
    error: programasError,
  } = useQuery<Programa[], AxiosError<ApiErrorResponse>>({
    queryKey: ['programas'],
    queryFn: usuariosService.getProgramas,
  })

  const crearSimulacroMutation = useMutation({
    mutationFn: simulacrosService.crearSimulacro,
    onSuccess: () => {
      navigate('/simulacros', {
        state: { successMessage: 'Simulacro creado correctamente.' },
      })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const responseData = error.response?.data
      const detail = responseData?.detail ?? responseData?.detalle

      if (detail) {
        setFormError(String(detail))
        return
      }

      if (responseData && typeof responseData === 'object') {
        const firstFieldError = Object.values(responseData).find(
          (value) => Array.isArray(value) && value.length > 0,
        ) as string[] | undefined

        if (firstFieldError?.[0]) {
          setFormError(firstFieldError[0])
          return
        }
      }

      setFormError('No fue posible crear el simulacro.')
    },
  })

  const agregarRegla = () => {
    setReglas((prevReglas) => [
      ...prevReglas,
      {
        modulo_id: '',
        cantidad_facil: 0,
        cantidad_media: 0,
        cantidad_alta: 0,
        distribucion_automatica: true,
        total_preguntas: 0,
      },
    ])
  }

  const eliminarRegla = (index: number) => {
    setReglas((prevReglas) => prevReglas.filter((_, reglaIndex) => reglaIndex !== index))
  }

  const actualizarRegla = (
    index: number,
    campo: 'modulo_id' | 'cantidad_facil' | 'cantidad_media' | 'cantidad_alta',
    valor: string | number,
  ) => {
    setReglas((prevReglas) =>
      prevReglas.map((regla, reglaIndex) => {
        if (reglaIndex !== index) {
          return regla
        }

        if (campo === 'modulo_id') {
          return {
            ...regla,
            modulo_id: valor === '' ? '' : Number(valor),
          }
        }

        return {
          ...regla,
          [campo]: Math.max(0, Number(valor) || 0),
        }
      }),
    )
  }

  const handleTotalChange = (index: number, total: number) => {
    const totalNormalizado = Math.max(0, Number(total) || 0)
    const facil = Math.floor(totalNormalizado / 3)
    const media = Math.floor(totalNormalizado / 3)
    const alta = totalNormalizado - facil - media

    setReglas((prevReglas) => {
      const nuevasReglas = [...prevReglas]
      nuevasReglas[index] = {
        ...nuevasReglas[index],
        total_preguntas: totalNormalizado,
        cantidad_facil: facil,
        cantidad_media: media,
        cantidad_alta: alta,
      }
      return nuevasReglas
    })
  }

  const toggleModoDistribucion = (index: number) => {
    setReglas((prevReglas) =>
      prevReglas.map((regla, reglaIndex) => {
        if (reglaIndex !== index) {
          return regla
        }

        const nuevoAutomatico = !regla.distribucion_automatica
        const totalActual = regla.cantidad_facil + regla.cantidad_media + regla.cantidad_alta

        if (nuevoAutomatico) {
          const facil = Math.floor(totalActual / 3)
          const media = Math.floor(totalActual / 3)
          const alta = totalActual - facil - media

          return {
            ...regla,
            distribucion_automatica: true,
            total_preguntas: totalActual,
            cantidad_facil: facil,
            cantidad_media: media,
            cantidad_alta: alta,
          }
        }

        return {
          ...regla,
          distribucion_automatica: false,
          total_preguntas: totalActual,
        }
      }),
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!titulo.trim() || !descripcion.trim()) {
      window.alert('Debes completar el titulo y la descripcion.')
      return
    }

    if (tiempoMinutos <= 0) {
      window.alert('El tiempo debe ser mayor a 0 minutos.')
      return
    }

    if (!esParaTodos && !programaSeleccionado) {
      window.alert('Debes seleccionar un programa especifico.')
      return
    }

    if (!fechaInicio || !fechaFin) {
      window.alert('Debes definir fecha de inicio y fin.')
      return
    }

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const hoy = new Date()

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      window.alert('Las fechas no tienen un formato valido.')
      return
    }

    const margenMs = 5 * 60 * 1000
    if (inicio.getTime() < hoy.getTime() - margenMs) {
      window.alert('La fecha de inicio no puede estar en el pasado.')
      return
    }

    if (fin <= inicio) {
      window.alert('La fecha de fin debe ser posterior a la fecha de inicio.')
      return
    }

    if (reglas.length === 0) {
      window.alert('Debes agregar al menos un módulo.')
      return
    }

    const hayModulosSinSeleccionar = reglas.some((regla) => regla.modulo_id === '')
    if (hayModulosSinSeleccionar) {
      window.alert('Todas las reglas deben tener un módulo seleccionado.')
      return
    }

    const reglaConTotalCero = reglas.some(
      (regla) => regla.cantidad_facil + regla.cantidad_media + regla.cantidad_alta === 0,
    )
    if (reglaConTotalCero) {
      window.alert('Cada módulo debe tener al menos una pregunta en total.')
      return
    }

    const reglasNormalizadas = reglas.map((regla) => ({
      modulo_id: Number(regla.modulo_id),
      cantidad_facil: Number(regla.cantidad_facil),
      cantidad_media: Number(regla.cantidad_media),
      cantidad_alta: Number(regla.cantidad_alta),
    }))

    crearSimulacroMutation.mutate({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tiempo_minutos: tiempoMinutos,
      fecha_inicio: toIsoString(fechaInicio),
      fecha_fin: toIsoString(fechaFin),
      mostrar_resultados_inmediatos: mostrarResultadosInmediatos,
      activo,
      programa_id: esParaTodos ? null : Number(programaSeleccionado),
      reglas_modulos: reglasNormalizadas,
    })
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/simulacros')}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-usco-gris/30 px-3 py-2 text-sm font-semibold text-usco-gris transition hover:border-usco-vino hover:text-usco-vino"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-usco-vino">Crear Nuevo Simulacro</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-usco-gris">Titulo</span>
            <input
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-usco-gris">Tiempo (minutos)</span>
            <input
              type="number"
              min={1}
              value={tiempoMinutos}
              onChange={(event) => setTiempoMinutos(Number(event.target.value))}
              className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              required
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-usco-gris">Descripcion</span>
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-usco-gris">Fecha de Inicio</span>
            <input
              type="datetime-local"
              value={fechaInicio}
              onChange={(event) => setFechaInicio(event.target.value)}
              className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-usco-gris">Fecha de Fin</span>
            <input
              type="datetime-local"
              value={fechaFin}
              onChange={(event) => setFechaFin(event.target.value)}
              className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-usco-ocre/80 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={mostrarResultadosInmediatos}
              onChange={(event) => setMostrarResultadosInmediatos(event.target.checked)}
              className="h-4 w-4 accent-usco-vino"
            />
            <span className="text-sm font-medium text-usco-gris">Mostrar resultados inmediatos</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-usco-ocre/80 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
              className="h-4 w-4 accent-usco-vino"
            />
            <span className="text-sm font-medium text-usco-gris">Simulacro activo</span>
          </label>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-base font-bold text-usco-gris">Publico Objetivo</h3>

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-usco-gris">
              <input
                type="radio"
                name="publico"
                checked={esParaTodos}
                onChange={() => {
                  setEsParaTodos(true)
                  setProgramaSeleccionado('')
                }}
                className="text-usco-vino focus:ring-usco-vino"
              />
              <span>Todos los Programas (Prueba Generica)</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-usco-gris">
              <input
                type="radio"
                name="publico"
                checked={!esParaTodos}
                onChange={() => setEsParaTodos(false)}
                className="text-usco-vino focus:ring-usco-vino"
              />
              <span>Programa Especifico</span>
            </label>
          </div>

          {!esParaTodos && (
            <div className="mt-2 space-y-2">
              <label className="block text-sm text-usco-gris">Selecciona el Programa</label>
              <select
                value={programaSeleccionado}
                onChange={(event) =>
                  setProgramaSeleccionado(event.target.value ? Number(event.target.value) : '')
                }
                className="w-full rounded-xl border border-gray-300 p-2 text-sm text-usco-gris focus:border-usco-vino focus:ring-usco-vino"
                disabled={isLoadingProgramas || isErrorProgramas}
              >
                <option value="" disabled>
                  -- Elige un programa --
                </option>
                {programas.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </option>
                ))}
              </select>
              {isLoadingProgramas && <p className="text-xs text-usco-gris">Cargando programas...</p>}
              {isErrorProgramas && (
                <p className="text-xs text-red-700">
                  {programasError.response?.data?.detail ??
                    programasError.response?.data?.detalle ??
                    'No fue posible cargar los programas.'}
                </p>
              )}
            </div>
          )}
        </div>

        <hr className="my-6 border-gray-300" />

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-usco-vino">Reglas de Composicion del Examen</h3>

          {isLoadingModulos && (
            <p className="rounded-xl border border-usco-ocre/70 bg-white p-3 text-sm text-usco-gris">
              Cargando módulos...
            </p>
          )}

          {isErrorModulos && (
            <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {modulosError.response?.data?.detail ??
                modulosError.response?.data?.detalle ??
                'No fue posible cargar los módulos.'}
            </p>
          )}

          {!isLoadingModulos && !isErrorModulos && reglas.length === 0 && (
            <p className="rounded-xl border border-usco-ocre/70 bg-usco-fondo/60 p-3 text-sm text-usco-gris">
              Aún no has agregado módulos para este simulacro.
            </p>
          )}

          <div className="space-y-3">
            {reglas.map((regla, index) => {
              const totalRegla = regla.cantidad_facil + regla.cantidad_media + regla.cantidad_alta

              return (
                <div key={`${String(regla.modulo_id)}-${index}`} className="rounded-lg border border-usco-ocre/70 bg-white p-3 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="block flex-1">
                      <span className="mb-1 block text-sm font-semibold text-usco-gris">Módulo</span>
                      <select
                        value={regla.modulo_id === '' ? '' : String(regla.modulo_id)}
                        onChange={(event) => actualizarRegla(index, 'modulo_id', event.target.value)}
                        className="w-full rounded-xl border border-usco-ocre/80 px-3 py-2 text-sm text-usco-gris outline-none transition focus:border-usco-vino focus:ring-2 focus:ring-usco-vino/15"
                      >
                        <option value="">Selecciona un módulo</option>
                        {modulos.map((modulo) => (
                          <option key={modulo.id} value={modulo.id}>
                            {modulo.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => eliminarRegla(index)}
                      className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-red-700 transition hover:bg-red-100"
                      aria-label={`Eliminar regla ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="my-3 flex flex-col gap-2 rounded bg-gray-50 p-2 md:flex-row md:items-center md:justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={regla.distribucion_automatica}
                        onChange={() => toggleModoDistribucion(index)}
                        className="rounded text-usco-vino focus:ring-usco-vino"
                      />
                      Distribucion Automatica (Facil, Media, Alta)
                    </label>

                    {regla.distribucion_automatica && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-usco-gris">Total Preguntas:</span>
                        <input
                          type="number"
                          min={0}
                          value={regla.total_preguntas || ''}
                          onChange={(event) => handleTotalChange(index, Number(event.target.value))}
                          className="w-20 rounded border border-gray-300 p-1 text-sm text-usco-gris focus:ring-usco-vino"
                          placeholder="Ej: 35"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="block rounded-xl border border-green-200 bg-green-50 p-2">
                      <span className="mb-1 block text-xs font-semibold text-green-800">Cant. Facil</span>
                      <input
                        type="number"
                        min={0}
                        value={regla.cantidad_facil}
                        onChange={(event) => actualizarRegla(index, 'cantidad_facil', event.target.value)}
                        disabled={regla.distribucion_automatica}
                        readOnly={regla.distribucion_automatica}
                        className={`w-full rounded-md border px-2 py-1.5 text-sm outline-none ${
                          regla.distribucion_automatica
                            ? 'border-gray-200 bg-gray-100 text-gray-500'
                            : 'border-green-200 bg-white text-usco-gris focus:border-green-400'
                        }`}
                      />
                    </label>

                    <label className="block rounded-xl border border-yellow-200 bg-yellow-50 p-2">
                      <span className="mb-1 block text-xs font-semibold text-yellow-800">Cant. Media</span>
                      <input
                        type="number"
                        min={0}
                        value={regla.cantidad_media}
                        onChange={(event) => actualizarRegla(index, 'cantidad_media', event.target.value)}
                        disabled={regla.distribucion_automatica}
                        readOnly={regla.distribucion_automatica}
                        className={`w-full rounded-md border px-2 py-1.5 text-sm outline-none ${
                          regla.distribucion_automatica
                            ? 'border-gray-200 bg-gray-100 text-gray-500'
                            : 'border-yellow-200 bg-white text-usco-gris focus:border-yellow-400'
                        }`}
                      />
                    </label>

                    <label className="block rounded-xl border border-red-200 bg-red-50 p-2">
                      <span className="mb-1 block text-xs font-semibold text-red-800">Cant. Alta</span>
                      <input
                        type="number"
                        min={0}
                        value={regla.cantidad_alta}
                        onChange={(event) => actualizarRegla(index, 'cantidad_alta', event.target.value)}
                        disabled={regla.distribucion_automatica}
                        readOnly={regla.distribucion_automatica}
                        className={`w-full rounded-md border px-2 py-1.5 text-sm outline-none ${
                          regla.distribucion_automatica
                            ? 'border-gray-200 bg-gray-100 text-gray-500'
                            : 'border-red-200 bg-white text-usco-gris focus:border-red-400'
                        }`}
                      />
                    </label>
                  </div>

                  <p className="mt-3 text-right text-sm font-bold text-usco-vino">
                    Total: {totalRegla} preguntas
                  </p>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={agregarRegla}
            disabled={isLoadingModulos || isErrorModulos || modulos.length === 0}
            className="rounded-xl border border-usco-vino px-4 py-2 text-sm font-semibold text-usco-vino transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Agregar Módulo al Examen
          </button>
        </section>

        {formError && (
          <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {formError}
          </section>
        )}

        <button
          type="submit"
          disabled={crearSimulacroMutation.isPending}
          className="w-full rounded-xl bg-usco-vino p-3 text-base font-semibold text-white shadow transition hover:bg-[#741017] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {crearSimulacroMutation.isPending ? 'Guardando...' : 'Guardar Simulacro'}
        </button>
      </form>
    </section>
  )
}

export default CrearSimulacroPage
