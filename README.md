# Saber Pro USCO

Plataforma web para la preparacion de estudiantes de la Universidad Surcolombiana para pruebas tipo Saber Pro.

Este repositorio contiene:
- `backend/`: API REST en Django.
- `frontend/`: aplicacion React + Vite + TypeScript.
- `scripts/`: utilidades para correr backend/frontend en desarrollo.
- `tmp/`: prototipos y redisenos (no hacen parte de la app principal).

## Estado del proyecto

- Backend activo con modulos de usuarios y evaluaciones.
- Frontend activo con flujos para roles `ADMIN` y `ESTUDIANTE`.
- PWA configurada en frontend.
- El `README` fue actualizado para reflejar la estructura y comandos reales a fecha `2026-03-19`.

## Stack tecnologico

### Backend
- Django 5.1.x
- Django REST Framework
- JWT (`djangorestframework-simplejwt`)
- PostgreSQL
- `django-cors-headers`
- `python-dotenv`
- `pandas` + `openpyxl` (carga masiva por Excel)
- `google-generativeai` (generacion de opciones con IA)

### Frontend
- React 19
- TypeScript
- Vite 7
- React Router 7
- React Query
- Axios
- Tailwind CSS
- `vite-plugin-pwa`

## Estructura real del repo

```text
saber-pro/
|-- backend/
|   |-- core/
|   |-- users/
|   |-- evaluaciones/
|   |-- media/
|   `-- manage.py
|-- frontend/
|   |-- src/
|   |   |-- features/
|   |   |-- components/
|   |   |-- routes/
|   |   `-- lib/
|   |-- public/
|   `-- package.json
|-- scripts/
|-- tmp/
|-- Makefile
`-- README.md
```

## Requisitos

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+ (recomendado)
- Bash para usar `make dev` y scripts de `scripts/`

## Variables de entorno

No existen aun archivos `*.env.example`, por eso debes crearlos manualmente.

### Backend (`backend/.env`)

Variables requeridas por `backend/core/settings.py`:

```env
DB_NAME=saberpro
DB_USER=postgres
DB_PASSWORD=tu_password_real
DB_HOST=localhost
DB_PORT=5432
```

Variables opcionales:

```env
GEMINI_API_KEY=tu_api_key
GEMINI_MODEL=gemini-2.5-flash
```

### Frontend (`frontend/.env.local` o `frontend/.env`)

```env
VITE_API_URL=http://localhost:8000/api/
```

Si no defines `VITE_API_URL`, el frontend usa por defecto `http://localhost:8000/api/`.

## Instalacion y ejecucion

## 1) Backend

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U pip
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers python-dotenv psycopg2-binary pandas openpyxl google-generativeai Pillow
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## 2) Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## 3) Arranque rapido con Make (opcional)

Desde la raiz del repo:

```bash
make dev
```

Tambien puedes correr por separado:

```bash
make dev-backend
make dev-frontend
```

Nota: estos comandos usan scripts `bash`.

## URLs locales

- Frontend: `http://localhost:5173`
- Backend API base: `http://localhost:8000/api/`
- Admin Django: `http://localhost:8000/admin/`

## Endpoints principales

- Auth y usuario:
  - `POST /api/auth/login/`
  - `POST /api/auth/login/refresh/`
  - `GET /api/auth/perfil/`
  - `POST /api/auth/carga-masiva/`
- Evaluaciones:
  - prefijo base ` /api/evaluaciones/`
  - rutas de administrador: `/admin/*`
  - rutas de estudiante: `/estudiante/*`
  - IA: `POST /api/evaluaciones/ia/generar-opciones/`
- Admin analiticas:
  - `GET /api/admin/analiticas/kpis_globales/`

## Comandos utiles

### Frontend (`frontend/package.json`)

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Backend

- `python manage.py migrate`
- `python manage.py createsuperuser`
- `python manage.py test`

## Pruebas y calidad

- Existen archivos de test en:
  - `backend/users/tests.py`
  - `backend/evaluaciones/tests.py`
- Actualmente son plantillas basicas; falta ampliar cobertura.
- En frontend no hay script `test` configurado todavia.

## Notas importantes

- `tmp/` contiene material de rediseno y prototipos; no corresponde al producto en ejecucion.
- `backend/backend/.venv/` parece ser un entorno legado y no se usa por defecto.
- Si `DB_PASSWORD` queda en el placeholder (`tu_password`), Django falla intencionalmente al iniciar.

## Pendientes recomendados

- Crear `backend/requirements.txt`.
- Crear `backend/.env.example` y `frontend/.env.example`.
- Separar documentacion tecnica en `docs/` (arquitectura, API, despliegue, contribucion).

## Equipo

- Oscar Perdomo
- Santiago Vivieros
- Universidad Surcolombiana, Licenciatura en Matematica
