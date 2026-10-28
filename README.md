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

### Sprint 8
Contiene los entregables del Sprint 8, que incluyen:
- Docs del Proyecto del Sprint 8
- Formulario LOGT del Sprint 8

### Sprint 9
Contiene los entregables del Sprint 9, que incluyen:
- Docs del Proyecto del Sprint 9
- Formulario LOGT del Sprint 9

### Sprint 10
Contiene los entregables del Sprint 10, que incluyen:
- Docs del Proyecto del Sprint 10
- Formulario LOGT del Sprint 10

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

Definir `NODE_ENV=development` para trabajo local y `NODE_ENV=production` en
el servidor. Los datos de demostración se rechazan en cualquier entorno que no
sea `development` o `test`.

En desarrollo, el seed exige contraseñas iniciales propias, diferentes y de al
menos 12 caracteres; no existen claves predeterminadas en el repositorio:

```env
DEMO_DUENO_PASSWORD=<clave-local-segura>
DEMO_LABORATORISTA_PASSWORD=<otra-clave-local-segura>
```

El backend limita por defecto el inicio de sesión a cinco fallos por IP cada
15 minutos. `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` y `LOGIN_RATE_LIMIT_WINDOW_MS`
permiten ajustar esos valores. Si el backend se publica detrás de un proxy
inverso controlado, `TRUST_PROXY_HOPS` debe indicar su número exacto de saltos
(por defecto es `0`, sin proxies confiables); no se debe usar un valor mayor al
recorrido real de la solicitud.

### 3. Levantar todos los servicios

```bash
docker compose up --build
```

Esto levantará tres servicios permanentes y dos contenedores temporales de
preparación:

| Contenedor          | Servicio                         | Puerto expuesto |
|---------------------|----------------------------------|-----------------|
| `farmacias_db`      | PostgreSQL                       | `5432`          |
| `migrate`           | Migraciones de PostgreSQL        | No aplica       |
| `seed`              | Datos demo sólo en desarrollo | No aplica       |
| `farmacias_backend` | Node.js                          | `3000`          |
| `farmacias_frontend`| React/Vite                       | `5173`          |

En una base nueva, PostgreSQL crea la estructura desde
`backend/src/database/schema.sql`. En instalaciones existentes, el servicio
`migrate` aplica únicamente los archivos pendientes de
`backend/src/database/migrations/versioned`. Después, el servicio `seed` carga
automáticamente los datos de demostración cuando `NODE_ENV=development`. En
`production`, en un entorno diferente o si la variable está ausente, el seed
se omite sin impedir el despliegue.

El backend sólo inicia cuando la base está saludable, las migraciones
finalizaron y el paso condicional del seed terminó correctamente; el frontend
espera a que el backend también esté saludable.

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

# Consultar el estado y los health checks
docker compose ps

# Ejecutar manualmente las migraciones pendientes
docker compose run --rm migrate
```

## Despliegue con migraciones

Antes de desplegar sobre una instalación existente se debe crear un respaldo:

```bash
mkdir -p respaldos
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > respaldos/farmacom-antes-del-despliegue.dump
```

En el archivo `.env` del servidor se debe confirmar antes del despliegue:

```env
NODE_ENV=production
```

Con ese valor, el contenedor `seed` finaliza correctamente sin insertar datos
de demostración. El volumen existente de PostgreSQL se conserva y sólo se
aplican las migraciones que todavía no estén registradas.

Después se construyen las imágenes, se comprueban las migraciones de forma
explícita y se levantan los servicios:

```bash
docker compose build
docker compose run --rm migrate
docker compose up -d
docker compose ps
```

Cada migración se ejecuta dentro de una transacción. Si alguna falla, sus
cambios se revierten, el comando termina con error y no se debe iniciar la
versión nueva. Se revisa el error con `docker compose logs migrate`, se corrige
mediante una migración nueva y se repite el procedimiento. Una migración que ya
fue aplicada no se modifica.

Para comprobar manualmente la disponibilidad:

```bash
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:5173/
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
