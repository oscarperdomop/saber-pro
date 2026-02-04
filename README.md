# 📚 Aplicativo Pruebas Saber Pro USCO

Plataforma web interactiva para la preparación de estudiantes de la Universidad Surcolombiana de la Licenciatura en Matemática en las pruebas **Saber Pro**. Una solución didáctica y completa que permite a los estudiantes practicar, evaluar sus conocimientos y mejorar sus habilidades académicas.

**Proyecto de Grado** - Universidad Surcolombiana

---

## 🎯 Objetivo del Proyecto

Desarrollar una aplicación web que facilite la preparación de estudiantes de pregrado para las pruebas Saber Pro, proporcionando:

- ✅ **Exámenes simulados** con estructura similar a la prueba oficial
- ✅ **Retroalimentación inmediata** sobre respuestas y desempeño
- ✅ **Análisis detallado** de fortalezas y áreas de mejora

---

## 🚀 Características Principales

### 📝 Exámenes y Evaluaciones

- **Módulos temáticos** por competencia: Lectura Crítica, Razonamiento Cuantitativo, Inglés, Competencias Ciudadanas
- **Pruebas completas** que simulan la estructura oficial de Saber Pro
- **Pruebas parciales** para práctica de temas específicos (V2)
- **Banco de preguntas** que el administrador podrá crear y administrar
- **Retroalimentación inmediata** al finalizar cada examen
- **Modo práctica** y **modo evaluación** para diferentes estilos de aprendizaje (V2)

### 📊 Análisis y Reportes

- **Dashboard personalizado** con resumen de desempeño
- **Análisis de resultados** por competencia y tema
- **Identificación de fortalezas y debilidades** académicas
- **Comparativa de progreso** a lo largo del tiempo (V2)
- **Exportación de reportes** en PDF y Excel

### 🎓 Herramientas de Aprendizaje

- **Material de estudio** complementario por tema
- **Explicación detallada** de respuestas correctas e incorrectas
- **Glosario de términos** importantes
- **Recursos adicionales** para refuerzo

### 👤 Gestión de Usuarios

- **Autenticación segura** con credenciales institucionales (@usco.edu.co)
- **Perfiles personalizados** por estudiante
- **Seguimiento histórico** de evaluaciones (V2)

### ⚙️ Panel Administrativo

- **Gestión de usuarios** y estudiantes
- **Administración de pruebas** y preguntas
- **Monitoreo de progreso** grupal e individual (V2)
- **Reportes institucionales** de desempeño (V2)

---

## 💻 Stack Tecnológico

### Backend
- **Django** (72.3% Python) - Framework web robusto y versátil
- **Django REST Framework** - API RESTful
- **JWT** - Autenticación segura basada en tokens
- **PostgreSQL** - Base de datos relacional

### Frontend
- **React 19** (26.7% TypeScript) - Interfaz interactiva
- **TypeScript** - Tipado estático para mayor robustez
- **React Router v7** - Navegación en la aplicación
- **TailwindCSS** - Diseño responsivo y moderno
- **PWA** - Acceso offline y experiencia de app nativa

### Infraestructura
- **Git/GitHub** - Control de versiones
- **Vercel** - Despliegue en producción (frontend)

---

## 📁 Estructura del Proyecto

```
saber-pro/
├── backend/
│   ├── manage.py                   # Gestor de Django
│   ├── requirements.txt            # Dependencias Python
│   ├── config/
│   │   ├── settings.py             # Configuración de Django
│   │   ├── urls.py                 # Rutas principales
│   │   └── wsgi.py                 # WSGI para producción
│   ├── apps/
│   │   ├── usuarios/               # App de usuarios
│   │   ├── examenes/               # App de exámenes
│   │   ├── preguntas/              # App de preguntas
│   │   └── reportes/               # App de reportes
│   └── .env.example                # Variables de entorno
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Componentes React
│   │   ├── pages/                  # Páginas de la aplicación
│   │   ├── services/               # Integración con API
│   │   ├── hooks/                  # Custom hooks
│   │   ├── types/                  # Tipos TypeScript
│   │   └── styles/                 # Estilos TailwindCSS
│   ├── public/                     # Archivos estáticos
│   ├── package.json                # Dependencias Node.js
│   ├── vercel.json                 # Configuración Vercel
│   └── index.html                  # HTML principal
│
└── README.md                       # Este archivo
```

---

## 🔧 Instalación y Configuración

### Requisitos Previos
- Python 3.8+
- Node.js 16+
- Git

### Backend

```bash
# Clonar repositorio
git clone https://github.com/oscarperdomop/saber-pro.git
cd saber-pro/backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### Frontend

```bash
# Navegar al directorio frontend
cd ../frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

---

## 📖 Uso de la Aplicación

### Para Estudiantes

1. **Registro e Inicio de Sesión** con correo institucional
2. **Seleccionar módulo de estudio** o tipo de prueba
3. **Realizar evaluación** con retroalimentación inmediata
4. **Revisar resultados** y análisis detallado de desempeño
5. **Acceder a material de repaso** según áreas de mejora

### Para Administradores

1. **Dashboard de administración** para monitoreo
2. **Gestión de contenido** educativo
3. **Generación de reportes** institucionales
4. **Mantenimiento del sistema** y actualizaciones

---

## 📊 Métricas y Analítica

La plataforma registra y analiza:

- Tasa de aciertos por competencia
- Identificación de temas críticos

---

## 🔐 Seguridad

- ✅ Autenticación JWT con credenciales institucionales
- ✅ Validación de datos en backend y frontend
- ✅ HTTPS en producción
- ✅ Protección contra ataques CSRF
- ✅ Roles y permisos granulares

---

## 🚀 Despliegue

### Desarrollo Local

```bash
# Backend
cd backend
python manage.py runserver

# Frontend (en otra terminal)
cd frontend
npm run dev
```

### Producción

**Frontend en Vercel:**
```bash
# Vercel detectará automáticamente la configuración desde vercel.json
# Simplemente haz push a tu rama principal
git push origin main
# Vercel desplegará automáticamente
```

**Backend:**
- Disponible en: Pendiente de definir infraestructura
- Base de datos: PostgreSQL en producción

---

## 📚 Documentación Adicional

- **[API Documentation](./backend/docs/api.md)** - Referencia completa de endpoints
- **[Database Schema](./backend/docs/schema.md)** - Estructura de datos
- **[Contributing Guide](./CONTRIBUTING.md)** - Guía para contribuidores
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Instrucciones de despliegue


---

## 📝 Licencia

Este proyecto está licenciado bajo Licencia Institucional.

---

## 📧 Contacto y Soporte

- **Autores**: Oscar Perdomo, Santiago Vivieros
- **Universidad**: Universidad Surcolombiana
- **Programa**: Licenciatura en Matemática
- **Email**: u20192184281@usco.edu.co, u20211195526@usco.edu.co
- **Repositorio**: [saber-pro](https://github.com/oscarperdomop/saber-pro)

---

## 🙏 Agradecimientos

- **Universidad Surcolombiana** por el apoyo académico y la confianza depositada en este proyecto
- **Programa de Licenciatura en Matemática** por proporcionar el contexto y los requisitos para esta iniciativa
- **Semillero DevUrity** por el apoyo técnico, mentoría y cultura de innovación
- Comunidad de Django y React por las herramientas excelentes
- Tutores y evaluadores del proyecto de grado

---

**Última actualización**: Febrero 2026