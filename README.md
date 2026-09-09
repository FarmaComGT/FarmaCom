# Proyecto 1 - Ingeniería de Software 1

### Grupo 1

---

## Descripción del proyecto

Este repositorio contiene el proceso de análisis, diseño e implementación realizado para el proyecto del curso Ingeniería de Software 1. El trabajo se desarrolla para la cadena de farmacias **San Gabriel**, con el objetivo de analizar sus procesos actuales, identificar áreas de oportunidad y construir un sistema de gestión farmacéutica (**FarmaCom**).

El sistema incluye autenticación con roles, gestión de sucursales, gestión de usuarios y un inventario de productos, todo desplegado mediante contenedores Docker.

---

## Estructura del repositorio

### Avances 1
Documentos y materiales correspondientes al primer avance del proyecto.

### Avances 2
Documentos y materiales correspondientes al segundo avance del proyecto.

### Corte 1
Contiene los entregables del Corte 1, que incluyen:
- Informe completo del primer corte
- Formularios LOGT
- Enlaces de los documentos trabajados

### Corte 2
Contiene los entregables del Corte 2, que incluyen:
- Informe completo del segundo corte
- Formularios LOGT
- Enlaces de los documentos trabajados

### Corte 3
Contiene los entregables del Corte 3, que incluyen:
- Informe completo del tercer corte
- Formularios LOGT
- Diagramas y enlaces de los documentos trabajados

### Sprint 1
Contiene los entregables del Sprint 1, que incluyen:
- Proyecto del Sprint 1
- Formulario LOGT del Sprint 1

### Sprint 2
Contiene los entregables del Sprint 2, que incluyen:
- Proyecto del Sprint 2
- Formulario LOGT del Sprint 2

### Sprint 3
Contiene los entregables del Sprint 3, que incluyen:
- Proyecto del Sprint 3
- Formulario LOGT del Sprint 3

### Sprint 4
Contiene los entregables del Sprint 4, que incluyen:
- Proyecto del Sprint 4
- Formulario LOGT del Sprint 4

### Sprint 5
Contiene los entregables del Sprint 5, que incluyen:
- Docs del Proyecto del Sprint 5
- Formulario LOGT del Sprint 5

### Sprint 6
Contiene los entregables del Sprint 6, que incluyen:
- Docs del Proyecto del Sprint 6
- Formulario LOGT del Sprint 6
- Plan maestro de pruebas

### Sprint 7
Contiene los entregables del Sprint 7, que incluyen:
- Docs del Proyecto del Sprint 7
- Formulario LOGT del Sprint 7
- Plan maestro de pruebas actualizado

### Integrador
Contiene los archivos relacionados al primer documento integrador:
- Documento Integrador
- Enlaces importantes
- Imágenes de diagramas y Lean UX

### Scrum
Carpeta destinada para materiales relacionados con la metodología Scrum, utilizada en etapas posteriores del proyecto.

### backend/
Servidor Node.js con Express. Expone una API REST en el puerto `3000` con los módulos de autenticación, usuarios y sucursales.

### frontend/
Aplicación React + Vite + Tailwind CSS. Corre en el puerto `5173`.

---

## Requisitos previos

- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) instalados.
- Archivo `.env` en la raíz del proyecto con las variables necesarias para el entorno.

---

## Configuración del archivo `.env`


El archivo .env está incluido en .gitignore y no debe subirse al repositorio, se compartirá por otro medio.

---

## Cómo correr el proyecto con Docker

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

### 2. Crear el archivo `.env`

Colocar en la raíz del proyecto el archivo `.env` con las variables requeridas para el entorno de ejecución.

### 3. Levantar todos los servicios

```bash
docker compose up --build
```

Esto levantará tres contenedores:

| Contenedor          | Servicio   | Puerto expuesto |
|---------------------|------------|-----------------|
| `farmacias_db`      | PostgreSQL | `5432`          |
| `farmacias_backend` | Node.js    | `3000`          |
| `farmacias_frontend`| React/Vite | `5173`          |

El backend espera a que la base de datos esté lista antes de arrancar (healthcheck configurado). El esquema y los datos semilla se aplican automáticamente al iniciar desde `backend/src/database/schema.sql`.

### 4. Acceder a la aplicación

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **API:** [http://localhost:3000/api](http://localhost:3000/api)

### 5. Detener los servicios

```bash
docker compose down
```

Para detener **y eliminar los volúmenes**, esto borra la base de datos:

```bash
docker compose down -v
```

---

## Comandos útiles

```bash
# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```
# Cómo acceder al sistema desplegado en el servidor

Ingresar a la siguiente dirección: https://farmacom.website/login

El usuario de acceso para desarrollo se compartirá por otro medio para mayor seguridad.

---

## Integrantes del equipo

| Nombre | Carnet |
|--------|--------|
| Josué Antonio Isaac García Barrera | 24918 |
| José Manuel Sanchez Hernandez | 24092 |
| José Alberto Abril Suchite | 24585 |
| Pablo André Orellana Mijangos | 20555 |
| Andrés Esteban Ismalej González | 24005 |
