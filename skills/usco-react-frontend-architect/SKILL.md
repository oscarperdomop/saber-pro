---
name: usco-react-frontend-architect
description: Disenar, construir y refactorizar frontend enterprise en React + TypeScript para la plataforma Saber Pro (USCO), integrado con backend Django REST Framework. Usar cuando se soliciten componentes, paginas, features completas, arquitectura frontend, tipado de DTOs, integracion API con JWT/refresh token, optimizacion de rendimiento, o aplicacion estricta de identidad visual institucional USCO con Tailwind CSS.
---

# USCO React Frontend Architect

Construir frontend de grado empresarial para Saber Pro con React + TypeScript estricto, priorizando rendimiento, accesibilidad, seguridad con JWT y consistencia visual institucional USCO.

## Flujo De Trabajo

1. Identificar feature y alcance de entrega.
2. Disenar estructura por dominio (`src/features/<feature>`).
3. Definir tipos estrictos para props, DTOs, estados y respuestas de servicios.
4. Separar UI presentacional de hooks/servicios de negocio.
5. Integrar API con cliente centralizado y manejo JWT + refresh token.
6. Implementar cache y fetching con TanStack Query o SWR.
7. Optimizar renderizado y carga de rutas con memoizacion y code splitting.
8. Aplicar identidad visual USCO y validar accesibilidad base.

## Estandar De Identidad Visual USCO

Configurar Tailwind con esta paleta institucional:

- Vino tinto primario: `#8F141B`
- Gris secundario: `#4D626C`
- Ocre acento: `#DFD4A6`
- Blanco: `#FFFFFF`
- Negro: `#000000`
- Fondos suaves: `#F4E7E8`, `#EDEFF0`

Usar esta base en `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      usco: {
        wine: "#8F141B",
        gray: "#4D626C",
        ochre: "#DFD4A6",
        white: "#FFFFFF",
        black: "#000000",
        softWine: "#F4E7E8",
        softGray: "#EDEFF0",
      },
    },
  },
}
```

Aplicar usos recomendados:

- `usco.wine`: botones primarios, headers, iconos activos, enfasis.
- `usco.gray`: texto secundario, bordes, footer, elementos neutros.
- `usco.ochre`: highlights, fondos sutiles y advertencias suaves.

## Reglas Tecnicas Obligatorias

### TypeScript

- Definir `interface` o `type` para todo contrato de datos.
- Tipar props, estado local, parametros y retornos de hooks.
- Tipar DTOs de backend DRF explicitamente.
- Prohibir `any`.

### Arquitectura

- Organizar por features: `src/features/auth`, `src/features/evaluaciones`, etc.
- Agrupar por dominio dentro de cada feature: `components`, `hooks`, `services`, `types`.
- Mantener componentes de UI presentacionales.
- Extraer logica de negocio, side effects y API calls a hooks/servicios.

### Rendimiento

- Usar `React.memo` en componentes puros costosos o muy reutilizados.
- Usar `useMemo` para derivados pesados y `useCallback` para handlers propagados.
- Implementar `React.lazy` + `Suspense` por rutas/modulos.
- Evitar cargar modulos administrativos en flujos de estudiantes.
- Preferir TanStack Query o SWR para cache, reintentos y deduplicacion.
- Evitar Context API para estado global de alta frecuencia.

### Seguridad/API

- Crear cliente HTTP centralizado con inyeccion automatica de `Bearer`.
- Capturar `401 Unauthorized` y ejecutar refresh token transparente.
- Reintentar request original tras renovar token con control para evitar loops.
- Encapsular manejo de tokens en capa de servicios de autenticacion.

## Plantilla De Estructura Recomendada

```text
src/
  app/
    router/
  shared/
    components/
    lib/
  features/
    auth/
      components/
      hooks/
      services/
      types/
    evaluaciones/
      components/
      hooks/
      services/
      types/
```

## Contrato De Respuesta Al Usuario

Cuando el usuario pida crear un componente o feature:

1. Entregar codigo funcional listo para uso.
2. Entregar tipado completo sin `any`.
3. Entregar estilos Tailwind con paleta USCO.
4. Priorizar carga rapida y evitar renders innecesarios.
5. Incluir capa de datos desacoplada cuando exista interaccion API.
