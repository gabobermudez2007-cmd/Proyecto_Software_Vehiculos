# Proyecto 4 · Registro de Mantenimientos de una Flota de Vehículos

API REST para que una empresa lleve la hoja de vida de sus vehículos, registre cada mantenimiento que se les hace, consulte el historial y reciba **alertas** cuando un vehículo ya superó el kilometraje o el tiempo previsto para su próximo servicio.

Proyecto del curso **Desarrollo de Software 2026-3** · Pontificia Universidad Javeriana.
Estado actual: **Entrega 2 (desarrollo y pruebas)**. La interfaz web en Angular, las estadísticas y los reportes CSV corresponden a la Entrega 3.

**Equipo:** Julián Trujillo · Ricardo Bermúdez · Tomás Zambrano · Kevin Ardila
**Docente:** Santiago Andrés Peña Arismendi

---

## Tabla de contenido

1. [Tecnologías](#1-tecnologías)
2. [Estructura del repositorio](#2-estructura-del-repositorio)
3. [Requisitos](#3-requisitos)
4. [Instalación paso a paso](#4-instalación-paso-a-paso)
5. [Variables de entorno y configuración](#5-variables-de-entorno-y-configuración)
6. [Ejecutar la aplicación](#6-ejecutar-la-aplicación)
7. [Datos de prueba](#7-datos-de-prueba)
8. [Uso de la API](#8-uso-de-la-api)
9. [Ver los datos en MySQL Workbench](#9-ver-los-datos-en-mysql-workbench)
10. [Pruebas automáticas (JUnit + Testcontainers + Docker)](#10-pruebas-automáticas-junit--testcontainers--docker)
11. [Pruebas con Postman](#11-pruebas-con-postman)
12. [Problemas frecuentes](#12-problemas-frecuentes)
13. [Flujo de trabajo con Git](#13-flujo-de-trabajo-con-git)
14. [Documentación del proyecto](#14-documentación-del-proyecto)

---

## 1. Tecnologías

| Herramienta | Versión | Uso |
|---|---|---|
| Java | 21 | Lenguaje del backend |
| Spring Boot | 4.0.8 | Web MVC, Data JPA, Validation |
| Hibernate / JPA | 7 | Mapeo objeto-relacional; crea las tablas solo |
| MySQL | 8.4 | Base de datos |
| Maven Wrapper | incluido (`mvnw`) | Compilar, ejecutar y probar sin instalar Maven |
| JUnit 5 + MockMvc | incluidos en Spring Boot | Pruebas de integración automáticas |
| Testcontainers | gestionado por Spring Boot | MySQL desechable en Docker para las pruebas |
| Docker Desktop | reciente | Correr MySQL y las pruebas automáticas |
| Postman | reciente | Pruebas manuales de la API |

## 2. Estructura del repositorio

```
Proyecto_Software_Vehiculos/
├── backend/                         API REST (Spring Boot)
│   ├── mvnw, mvnw.cmd               Maven Wrapper (no hay que instalar Maven)
│   ├── pom.xml                      Dependencias
│   └── src/
│       ├── main/java/flota_backend/
│       │   ├── config/              DatosIniciales: carga datos de prueba al arrancar
│       │   ├── controller/          Endpoints HTTP (sin lógica de negocio)
│       │   ├── dto/                 Objetos de entrada/salida con validaciones
│       │   ├── exception/           Excepciones propias y GlobalExceptionHandler
│       │   ├── model/               Entidades JPA y enums
│       │   ├── repository/          Acceso a datos (Spring Data JPA)
│       │   └── service/             Reglas de negocio
│       ├── main/resources/
│       │   └── application.properties
│       └── test/java/flota_backend/
│           ├── TestcontainersConfiguration.java   MySQL en Docker para las pruebas
│           ├── FlotaApplicationTests.java
│           └── integracion/         42 pruebas de integración (ver sección 10)
├── docs/
│   ├── Entrega2-Proyecto Vehiculos.docx   Informe de la Entrega 2
│   ├── Pruebas-Unitarias-Entrega_2.docx   Evidencia de las pruebas manuales en Postman
│   ├── postman/Flota.postman_collection.json
│   └── img/                         Capturas usadas en este README
└── frontend/                        Interfaz web (Entrega 3)
```

Arquitectura en capas: `Controller → Service → Repository → MySQL`. Ningún controlador accede a la base de datos directamente.

## 3. Requisitos

| Herramienta | ¿Obligatoria? | Cómo comprobarla | Descarga |
|---|---|---|---|
| **JDK 21** | Sí | `java -version` → debe decir `21` | [Adoptium Temurin 21](https://adoptium.net/temurin/releases/?version=21) |
| **Git** | Sí | `git --version` | [git-scm.com](https://git-scm.com/downloads) |
| **Docker Desktop** | Sí para las pruebas automáticas; recomendada para MySQL | `docker info` (debe mostrar *Server Version*) | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **MySQL Server 8** | Solo si **no** usas MySQL en Docker | servicio MySQL80 iniciado | [dev.mysql.com](https://dev.mysql.com/downloads/mysql/) |
| MySQL Workbench | Opcional (ver los datos) | — | [dev.mysql.com](https://dev.mysql.com/downloads/workbench/) |
| Postman | Opcional (pruebas manuales) | — | [postman.com](https://www.postman.com/downloads/) |
| VS Code + Extension Pack for Java | Opcional (editor) | — | [code.visualstudio.com](https://code.visualstudio.com/) |

> **Maven no se instala:** el proyecto trae el *Maven Wrapper* (`mvnw.cmd` en Windows, `./mvnw` en Linux/Mac), que descarga Maven solo la primera vez.

### Notas sobre Docker Desktop en Windows

- Descarga la versión **AMD64** (procesadores Intel o AMD) o **ARM64** (Snapdragon) según tu equipo.
- Si al abrir Docker aparece *"Virtual Machine Platform is not enabled"*, en PowerShell **como administrador**:
  ```powershell
  Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All
  Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All
  # Reinicia el computador y luego:
  wsl --update
  ```
  Si sigue fallando, activa la virtualización (SVM en AMD, VT-x en Intel) en la BIOS.
- Docker está listo cuando en la barra inferior de Docker Desktop aparece el ✓ (*Engine running*) o cuando `docker run --rm hello-world` imprime *Hello from Docker!*

## 4. Instalación paso a paso

### 4.1 Clonar el repositorio

```powershell
git clone https://github.com/gabobermudez2007-cmd/Proyecto_Software_Vehiculos.git
cd Proyecto_Software_Vehiculos\backend
```

### 4.2 Preparar la base de datos (elige **una** opción)

No hay que crear tablas a mano: la aplicación crea la base `flota_db` si no existe (`createDatabaseIfNotExist=true`) y Hibernate genera las tablas al arrancar (`ddl-auto=update`).

#### Opción A (recomendada): MySQL en Docker

Un solo comando, igual en todos los computadores. Usa el puerto **3307** para no chocar con un MySQL local que ya ocupe el 3306.

```powershell
docker run -d --name flota-mysql `
  -e MYSQL_ROOT_PASSWORD=TU_CLAVE `
  -e MYSQL_DATABASE=flota_db `
  -e TZ=America/Bogota `
  -p 3307:3306 `
  -v flota-mysql-datos:/var/lib/mysql `
  --restart unless-stopped `
  mysql:8.4
```

> En Linux/Mac reemplaza las comillas invertidas `` ` `` por `\`. Cambia `TU_CLAVE` por una contraseña tuya y **no la subas al repositorio**.

| Parte del comando | Qué hace |
|---|---|
| `--name flota-mysql` | Nombre del contenedor, para manejarlo después |
| `-e MYSQL_ROOT_PASSWORD=...` | Contraseña del usuario `root` |
| `-e MYSQL_DATABASE=flota_db` | Crea la base al iniciar |
| `-p 3307:3306` | El puerto 3307 de tu PC apunta al 3306 del contenedor |
| `-v flota-mysql-datos:/var/lib/mysql` | Volumen: los datos sobreviven si se apaga el contenedor |
| `--restart unless-stopped` | Arranca solo cuando abres Docker Desktop |

Comandos útiles:

```powershell
docker ps                          # ver si está corriendo
docker stop flota-mysql            # apagarlo (los datos se conservan)
docker start flota-mysql           # encenderlo de nuevo
docker logs flota-mysql            # ver el registro si algo falla
docker rm -f flota-mysql; docker volume rm flota-mysql-datos   # borrarlo TODO y empezar de cero
```

#### Opción B: MySQL instalado en el computador

1. Instala MySQL Server 8 y anota la contraseña de `root`.
2. Verifica que el servicio esté iniciado (Windows: *Servicios* → `MySQL80` → *Iniciar*).
3. Usa el puerto **3306** en la configuración de la sección 5.

## 5. Variables de entorno y configuración

La conexión **no está escrita en el código**: `application.properties` la lee de variables de entorno, con valores por defecto para desarrollo.

| Variable | Para qué | Valor por defecto | Ejemplo con Docker (opción A) |
|---|---|---|---|
| `DB_URL` | Dirección JDBC de la base | `jdbc:mysql://localhost:3306/flota_db?createDatabaseIfNotExist=true&serverTimezone=America/Bogota` | `jdbc:mysql://localhost:3307/flota_db?createDatabaseIfNotExist=true&serverTimezone=America/Bogota` |
| `DB_USER` | Usuario de MySQL | `root` | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | *(vacía)* | la que pusiste en `MYSQL_ROOT_PASSWORD` |
| `CARGAR_DATOS_PRUEBA` | Cargar los datos de ejemplo al arrancar si la base está vacía | `true` | `true` |

Otras propiedades fijas en `application.properties`: puerto `8080`, `ddl-auto=update`, `open-in-view=false`, `show-sql=true`.

Hay **tres formas** de dar estos valores; usa la que prefieras.

### Forma 1: variables en la terminal (solo duran mientras esté abierta)

PowerShell:
```powershell
$env:DB_URL = "jdbc:mysql://localhost:3307/flota_db?createDatabaseIfNotExist=true&serverTimezone=America/Bogota"
$env:DB_PASSWORD = "TU_CLAVE"
```

Linux/Mac:
```bash
export DB_URL="jdbc:mysql://localhost:3307/flota_db?createDatabaseIfNotExist=true&serverTimezone=America/Bogota"
export DB_PASSWORD="TU_CLAVE"
```

### Forma 2: variables permanentes de Windows

```powershell
setx DB_URL "jdbc:mysql://localhost:3307/flota_db?createDatabaseIfNotExist=true&serverTimezone=America/Bogota"
setx DB_PASSWORD "TU_CLAVE"
```
Cierra y abre de nuevo la terminal (y VS Code) para que las tome.

### Forma 3: archivo `application-local.properties` (recomendada para el día a día)

Crea el archivo `backend/src/main/resources/application-local.properties` con:

```properties
spring.datasource.url=jdbc:mysql://localhost:3307/flota_db?createDatabaseIfNotExist=true&serverTimezone=America/Bogota
spring.datasource.username=root
spring.datasource.password=TU_CLAVE
```

`application.properties` lo importa automáticamente (`spring.config.import=optional:classpath:application-local.properties`) y sus valores tienen prioridad. **Este archivo está en el `.gitignore`**, así que tu contraseña nunca se sube.

## 6. Ejecutar la aplicación

Desde la carpeta `backend`:

```powershell
.\mvnw.cmd spring-boot:run        # Windows
./mvnw spring-boot:run            # Linux/Mac
```

- La primera vez tarda varios minutos (descarga las dependencias).
- Está lista cuando aparece `Tomcat started on port 8080` y `Started FlotaApplication`.
- Para detenerla: `Ctrl + C`.

### Comprobar que funciona

Abre en el navegador:

| Dirección | Debe mostrar |
|---|---|
| http://localhost:8080/api/vehiculos | Los 7 vehículos de prueba en JSON |
| http://localhost:8080/api/vehiculos/999 | Error 404 en formato ProblemDetail |
| http://localhost:8080/api/alertas | Las alertas de los vehículos vencidos |

## 7. Datos de prueba

Si `CARGAR_DATOS_PRUEBA=true` y la tabla de vehículos está **vacía**, `DatosIniciales` carga estos datos (las fechas se calculan desde hoy, así que siempre hay alertas que mostrar):

**Tipos de servicio:** Cambio de aceite (cada 10.000 km o 6 meses) · Revisión de frenos (20.000 km o 12 meses) · Rotación de llantas (10.000 km o 6 meses).
**Talleres:** Taller Central · AutoServicio Norte.

| Placa | Tipo | Km actual | Situación esperada en `/api/alertas` |
|---|---|---|---|
| ABC123 | Automóvil | 58.500 | Al día (no aparece) |
| DEF456 | Camioneta | 84.000 | Vencido por **kilometraje** (aceite) |
| GHI789 | Camión | 120.300 | Vencido por **tiempo** (aceite) |
| JKL012 | Bus | 210.000 | Vencido por **ambos** (llantas) · el más crítico |
| MNO34E | Motocicleta | 15.200 | Sin mantenimientos (no aparece) |
| PQR678 | Automóvil | 33.000 | **INACTIVO** (no aparece, pero conserva su historial) |
| STU901 | Camioneta | 47.800 | Aceite al día; **frenos** vencidos por ambos |

Orden esperado de las alertas: **JKL012 → STU901 → GHI789 → DEF456**.

Para volver a los datos originales: borra la base (sección 11.4) y arranca la aplicación otra vez.

## 8. Uso de la API

Base: `http://localhost:8080`

| Método | Ruta | Qué hace | Éxito | Requisito |
|---|---|---|---|---|
| POST | `/api/vehiculos` | Registra un vehículo | 201 + encabezado `Location` | RF-01 |
| GET | `/api/vehiculos?placa=&tipo=&estado=` | Lista la flota; filtros opcionales | 200 | RF-02 |
| GET | `/api/vehiculos/{id}` | Consulta un vehículo | 200 | RF-02 |
| PUT | `/api/vehiculos/{id}` | Edita un vehículo | 200 | RF-03 |
| DELETE | `/api/vehiculos/{id}` | Da de baja (borra si no tiene mantenimientos; si tiene, queda INACTIVO) | 200 | RF-04 |
| POST | `/api/mantenimientos` | Registra un mantenimiento | 201 | RF-05 |
| GET | `/api/mantenimientos/vehiculo/{id}` | Historial del vehículo, del más reciente al más antiguo | 200 | RF-06 |
| GET | `/api/alertas?tipo=` | Vehículos con mantenimiento vencido, por criticidad | 200 | RF-08/09 |

Valores permitidos: `tipo` = `AUTOMOVIL`, `CAMIONETA`, `CAMION`, `BUS`, `MOTOCICLETA` · `estado` = `ACTIVO`, `INACTIVO`.

### Ejemplos

Registrar un vehículo:
```json
POST /api/vehiculos
{
  "placa": "xyz789",
  "tipo": "CAMIONETA",
  "marca": "Toyota",
  "modelo": "Hilux",
  "kilometrajeActual": 15000
}
```
La placa debe tener el formato `ABC123` o `ABC12D` y se guarda en mayúsculas (`XYZ789`).

Registrar un mantenimiento:
```json
POST /api/mantenimientos
{
  "vehiculoId": 1,
  "tipoServicioId": 1,
  "tallerId": 1,
  "fecha": "2026-10-10",
  "kilometraje": 60000,
  "costo": 185000.00
}
```
Reglas: la fecha no puede ser futura; el costo no puede ser negativo ni tener más de 2 decimales; el kilometraje no puede ser menor al del último mantenimiento; no se registran mantenimientos a un vehículo INACTIVO. Si el kilometraje supera el del vehículo, el del vehículo se actualiza.

### Respuestas de error

Todos los errores llegan en el formato estándar **ProblemDetail** (RFC 7807):

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "No existe un vehículo con id 999",
  "instance": "/api/vehiculos/999"
}
```

| Situación | Código |
|---|---|
| Campos inválidos (incluye el mapa `errores` con el mensaje de cada campo) | 400 |
| JSON mal formado o valor no permitido (por ejemplo `"tipo": "AVION"`) | 400 |
| Parámetro de la URL con tipo incorrecto (`/api/vehiculos/abc`) | 400 |
| Recurso inexistente | 404 |
| Placa repetida o restricción de la base | 409 |
| Regla de negocio incumplida (kilometraje que retrocede, vehículo inactivo) | 422 |

## 9. Ver los datos en MySQL Workbench

1. *Database → Manage Connections → New*.
2. **Hostname:** `127.0.0.1` · **Port:** `3307` (Docker) o `3306` (MySQL local) · **Username:** `root`.
3. *Store in Vault…* → tu contraseña → *Test Connection* → *OK*.
4. Abre la conexión y ejecuta, por ejemplo:

```sql
USE flota_db;
SELECT id, placa, tipo, kilometraje_actual, estado FROM vehiculo;

-- Historial de un vehículo, igual que GET /api/mantenimientos/vehiculo/{id}
SELECT m.id, m.fecha, ts.nombre AS servicio, m.kilometraje, m.costo
FROM mantenimiento m JOIN tipo_servicio ts ON ts.id = m.tipo_servicio_id
WHERE m.vehiculo_id = 1
ORDER BY m.fecha DESC, m.id DESC;
```

## 10. Pruebas automáticas (JUnit + Testcontainers + Docker)

El proyecto tiene **42 pruebas automáticas**: 41 de integración en `backend/src/test/java/flota_backend/integracion/` y la prueba de arranque `FlotaApplicationTests`.

### 10.1 Cómo correrlas

**Único requisito: Docker Desktop abierto.** No hace falta MySQL instalado, ni crear la base, ni configurar contraseñas.

Desde la carpeta `backend`:

| Qué correr | Comando (Windows) |
|---|---|
| Todas las pruebas | `.\mvnw.cmd test` |
| Una clase | `.\mvnw.cmd test "-Dtest=AlertaIntegrationTests"` |
| Una sola prueba | `.\mvnw.cmd test "-Dtest=AlertaIntegrationTests#vencidoPorKilometraje"` |
| Varias de una clase | `.\mvnw.cmd test "-Dtest=AlertaIntegrationTests#vencidoPorKilometraje+vencidoPorTiempo"` |

En Linux/Mac: `./mvnw test` (las comillas son opcionales).

Resultado esperado (≈ 1 minuto; la primera vez más, porque Docker descarga la imagen `mysql:8.4`):

```
[INFO] Tests run: 42, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Desde **VS Code**: panel *Testing* (ícono del matraz) → ▶ sobre la clase o sobre una prueba. Cada prueba muestra su nombre en español (`@DisplayName`).

Los reportes quedan en `backend/target/surefire-reports/`.

### 10.2 Qué cubren

| Clase | Pruebas | Funcionalidad |
|---|---|---|
| `VehiculoIntegrationTests` | 13 | Registrar, listar con filtros, consultar, editar y dar de baja vehículos (RF-01 a RF-04) |
| `MantenimientoIntegrationTests` | 9 | Registrar mantenimientos y sus validaciones (RF-05, RNF-07) |
| `HistorialIntegrationTests` | 7 | Historial ordenado por fecha (RF-06) |
| `AlertaIntegrationTests` | 12 | Alertas por kilometraje o tiempo, orden por criticidad y exclusiones (RF-08/09) |
| `FlotaApplicationTests` | 1 | La aplicación arranca y se conecta a MySQL |
| **Total** | **42** | |

Incluyen los casos de éxito, todas las reglas de negocio y cada código de error (400, 404, 409, 422).

### 10.3 Cómo funcionan

```
.\mvnw.cmd test
  ├─ Maven compila el código y las pruebas
  ├─ Surefire toma las clases que terminan en *Tests; JUnit ejecuta los métodos @Test
  ├─ @SpringBootTest arranca la aplicación completa
  ├─ Testcontainers crea en Docker un MySQL 8.4 nuevo y vacío (puerto aleatorio)
  ├─ @ServiceConnection conecta Spring a ese MySQL (ignora DB_URL y DB_PASSWORD)
  ├─ Antes de cada prueba se vacían las tablas (@BeforeEach)
  ├─ Cada prueba: prepara datos → petición HTTP con MockMvc → verifica código y JSON
  └─ Al terminar, el contenedor se destruye (Ryuk)
```

Cada petición recorre el sistema real: `MockMvc → Controller → Service → Repository → MySQL`. Por eso son **pruebas de integración**. Nunca tocan tu base `flota_db`.

### 10.4 Evidencia

Ejecución completa de `./mvnw test` del 16 de octubre de 2026 sobre la rama principal.

**1. Inicio:** Maven compila y Surefire arranca las pruebas con JUnit 5.

![Inicio de la ejecución de las pruebas](docs/img/pruebas-1-inicio.png)

**2. Testcontainers en acción:** se crea el contenedor `mysql:8.4` en un puerto aleatorio, Spring se conecta (MySQL 8.4.11), Hibernate crea las tablas y cada prueba vacía e inserta sus datos.

![Testcontainers levantando MySQL en Docker](docs/img/pruebas-2-testcontainers.png)

**3. Resultado:** 42 pruebas, 0 fallas, 0 errores, BUILD SUCCESS.

![Resultado: 42 pruebas, BUILD SUCCESS](docs/img/pruebas-3-resultado.png)

## 11. Pruebas con Postman

La colección [`docs/postman/Flota.postman_collection.json`](docs/postman/Flota.postman_collection.json) tiene **29 peticiones** con verificaciones automáticas (scripts de *Tests*), organizadas en 5 carpetas: Vehículos, Mantenimientos, Historial, Alertas y Baja de vehículos.

### 11.1 Preparación

1. La base debe tener **los datos de prueba recién cargados** (sección 7).
2. Arranca la aplicación (sección 6).

### 11.2 Importar la colección

Postman → **Import** → arrastra `docs/postman/Flota.postman_collection.json`.
La variable `baseUrl` ya viene con `http://localhost:8080` (pestaña *Variables* de la colección).

### 11.3 Ejecutarla

- **Toda la colección:** clic derecho sobre la colección → **Run collection** → **Run**. Las peticiones deben ir **en orden**, porque unas guardan datos (ids, placas) que usan las siguientes. Al final cada verificación debe salir en verde (*Passed*).
- **Una petición:** ábrela → **Send** → pestaña **Test Results** de la respuesta.

Lo que hace la colección: crea dos vehículos con placas aleatorias, les registra un mantenimiento, prueba cada error (400, 404, 409, 422), consulta el historial y las alertas de los datos de prueba, y termina dando de baja los dos vehículos (uno queda INACTIVO y el otro se borra).

### 11.4 Volver a correrla desde cero

La colección modifica la base, así que para repetirla con los mismos resultados conviene recargar los datos:

```powershell
# MySQL en Docker:
docker exec -it flota-mysql mysql -uroot -p -e "DROP DATABASE flota_db;"
# MySQL local: en Workbench ejecutar  DROP DATABASE flota_db;
```
Luego reinicia la aplicación: crea la base vacía y vuelve a cargar los datos de prueba.

> Las capturas de las pruebas manuales hechas por el equipo en Postman están en `docs/Pruebas-Unitarias-Entrega_2.docx`.

## 12. Problemas frecuentes

| Mensaje | Causa | Solución |
|---|---|---|
| `Communications link failure` | MySQL no está corriendo o el puerto es otro | `docker start flota-mysql` o iniciar el servicio MySQL80; revisar el puerto en `DB_URL` |
| `Access denied for user 'root'` | Contraseña incorrecta | Revisar `DB_PASSWORD` o `application-local.properties` |
| `Public Key Retrieval is not allowed` | Autenticación de MySQL 8 sin SSL | Añadir `&allowPublicKeyRetrieval=true` al final de `DB_URL` |
| `Port 8080 was already in use` | Otra instancia sigue abierta | Cerrarla con `Ctrl + C` o cambiar `server.port` |
| `port is already allocated` al hacer `docker run` | El 3307 ya está ocupado | Usar otro puerto (`-p 3308:3306`) y ajustar `DB_URL` |
| `Could not find a valid Docker environment` al correr las pruebas | Docker Desktop cerrado | Abrir Docker Desktop y esperar *Engine running* |
| `Virtual Machine Platform is not enabled` | Falta habilitar la virtualización en Windows | Ver la sección 3 |
| `JAVA_HOME is not set` / `java no se reconoce` | Java no instalado o fuera del PATH | Instalar JDK 21 y reabrir la terminal |
| `'mvnw' no se reconoce` | La terminal no está en `backend` | `cd backend` y usar `.\mvnw.cmd` |
| Postman: falla la 1.1 | La base no tiene los datos de prueba | Recargar la base (sección 11.4) |

## 13. Flujo de trabajo con Git

El equipo usa **GitHub Flow**: `main` siempre estable y una rama por unidad de trabajo, integrada mediante *pull request* revisado por otro integrante.

- `chore/...` → preparación técnica (configuración, estructura).
- `feature/...` → una funcionalidad del catálogo de requisitos.
- `docs/...` → documentación.

```powershell
git checkout main
git pull origin main
git checkout -b feature/nombre-de-la-funcionalidad
# ...trabajar, luego:
git add <archivos>
git commit -m "PDS-XX Descripción del cambio"
git push -u origin feature/nombre-de-la-funcionalidad
# abrir el Pull Request hacia main en GitHub
```

Nunca se suben credenciales: `.env` y `application-local.properties` están en el `.gitignore`.

## 14. Documentación del proyecto

- [`docs/Entrega2-Proyecto Vehiculos.docx`](docs/Entrega2-Proyecto%20Vehiculos.docx): informe de la Entrega 2 (implementación, control de versiones, pruebas, manual técnico y calidad del código).
- [`docs/Pruebas-Unitarias-Entrega_2.docx`](docs/Pruebas-Unitarias-Entrega_2.docx): capturas de las pruebas manuales en Postman.
- [`docs/postman/Flota.postman_collection.json`](docs/postman/Flota.postman_collection.json): colección de Postman.
