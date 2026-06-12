# 🏆 Calendario Mundial de Fútbol Masculino 2026

Una plataforma web interactiva y servicio de suscripción de calendario inteligente (`.ics` / Webcal) para el **Mundial de Fútbol de la FIFA Canadá, México y Estados Unidos 2026**. 

Esta solución permite a los usuarios suscribirse de manera sencilla a los 104 partidos del torneo, adaptándose de forma automática a la zona horaria local de sus dispositivos y ofreciendo actualizaciones en tiempo real de marcadores, tarjetas de TV y clasificaciones de grupos a medida que transcurren los encuentros.

---

## 🌟 Características Principales

### 📅 Suscripción de Calendario Webcal Dinámico
* **Sincronización en Tiempo Real**: Si un partido se reprograma o se definen los clasificados de la fase de llaves (dieciseisavos a final), tu calendario personal se actualizará de forma automática sin que tengas que hacer nada.
* **Huso Horario Local Automático**: Los horarios de los partidos se convierten automáticamente del huso horario de cada estadio (UTC-5 a UTC-8) a **UTC puro** en el archivo `.ics`, logrando que tu aplicación de calendario (Google, Apple o Outlook) muestre la hora correcta exacta según el lugar del mundo donde te encuentres.
* **Detalles Premium en cada Evento**: Cada evento en tu calendario incluye:
  * Nombres de los países en español con sus respectivas banderas de emojis (ej. `🇲🇽 México vs. 🇿🇦 Sudáfrica`).
  * Nombre oficial del estadio y ciudad anfitriona.
  * Guías de canales de televisión recomendadas para su transmisión.
  * Marcadores en vivo integrados en el título del evento (ej. `✅ [FIN] 🇲🇽 México 2 - 1 Sudáfrica 🇿🇦`).
  * Recordatorios / Alarmas configurables antes del inicio.

### 💻 Dashboard Web Interactivo
* **Tema Claro Premium por Defecto**: La interfaz de usuario inicia siempre con un diseño claro elegante basado en HSL y tonos oficiales del Mundial. Cuenta con un selector dinámico para conmutar a **Modo Oscuro** de forma fluida.
* **Identidad Visual Oficial**: Diseño minimalista, limpio, moderno y glassmorphic que utiliza la paleta oficial de colores de la FIFA 2026.
* **Filtros Avanzados e Interactivos**:
  * Filtros por país: Haz clic en el nombre o la bandera de cualquier país en el fixture para filtrar instantáneamente sus partidos.
  * Pestañas de estado ordenadas: *Todos, En Vivo, Próximos, Finalizados, Fase Final (Llaves)* y *Grupos*.
  * Diferenciación visual de grupos con 12 códigos de colores diferentes (Grupos A al L).
* **Tablas de Posiciones en Tiempo Real**:
  * La pestaña **Grupos** calcula dinámicamente y al vuelo las 12 tablas de posiciones completas del mundial basándose en los resultados reales o simulados de los encuentros.
  * Al hacer clic en la insignia del grupo en cualquier tarjeta de partido, se despliega un modal interactivo con la tabla de clasificación actualizada del grupo seleccionado.
* **Diseño 100% Responsivo**: Interfaz fluida y optimizada para cualquier dispositivo móvil, tablet u ordenador de escritorio. La barra lateral de configuración se colapsa de forma interactiva en pantallas móviles para mejorar el espacio de navegación.

### 🧪 Panel de Administración y Simulación
* Cuenta con un panel simulador (solo visible en desarrollo, o en producción con `NEXT_PUBLIC_ENABLE_SIMULATOR=true`) que te permite modificar marcadores, marcar partidos como "en vivo", finalizar encuentros y guardar estas anulaciones. Las tablas de posiciones y el feed del calendario se actualizarán al instante. La API de escritura está protegida en producción (ver Variables de Entorno).

---

## 🚀 Estructura de la Suscripción (Parámetros del Calendario)

La ruta de API `/api/calendar` (en `src/app/api/calendar/route.ts`) genera dinámicamente el archivo del calendario según las preferencias seleccionadas por el usuario:

| Parámetro | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `team` | `string` | Filtra el calendario para obtener solo los partidos de un país (ID del equipo). | `/api/calendar?team=1` |
| `group` | `string` | Filtra los partidos de un grupo específico (A-L). | `/api/calendar?group=A` |
| `stadium` | `string` | Filtra por estadio (ID del estadio). | `/api/calendar?stadium=1` |
| `region` | `string` | Código de país para la guía de canales de TV. | `/api/calendar?region=mx` |
| `alarm` | `string` | Activa (`true`) o desactiva (`false`) recordatorios de eventos. | `/api/calendar?alarm=true` |
| `alarmMinutes`| `number` | Minutos de anticipación para el recordatorio (por defecto 15). | `/api/calendar?alarmMinutes=30` |
| `scores` | `boolean`| Si se establece en `true` (por defecto), muestra los marcadores en vivo en tu calendario. | `/api/calendar?scores=true` |

### Variables de Entorno

| Variable | Descripción |
| :--- | :--- |
| `FOOTBALL_DATA_TOKEN` | Token gratuito de [football-data.org](https://www.football-data.org/client/register). Si se define, los marcadores, estados y minuto de juego se obtienen de esa API (actualización ~1 min); sin él se usa el proveedor de respaldo (worldcup26.ir). |
| `NEXT_PUBLIC_ENABLE_SIMULATOR` | `true` para mostrar el panel de simulación y habilitar la escritura en `/api/matches` en producción. Por defecto el simulador solo está disponible en desarrollo. |
| `ADMIN_TOKEN` | Si se define, permite `POST`/`DELETE` en `/api/matches` enviando el header `x-admin-token` con ese valor. |

---

## 🛠️ Instalación y Configuración Local

Sigue los siguientes pasos para ejecutar el proyecto en tu entorno local:

### Requisitos Previos
* **Node.js** (versión 18.x o superior)
* **npm** o tu gestor de paquetes de preferencia

### Pasos

1. **Clonar el proyecto** y dirigirte a su directorio raíz:
   ```bash
   cd calendario_mundial_2026
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para interactuar con la plataforma.

4. **Compilar para Producción**:
   ```bash
   npm run build
   ```
   Valida que no existan errores de tipado o de compilación estática.

5. **Iniciar en Modo Producción**:
   ```bash
   npm run start
   ```

---

## 📖 Instrucciones de Uso y Suscripción

### Cómo importar el calendario en tus aplicaciones preferidas:

#### 1. En Google Calendar (Web)
1. Copia la URL Webcal generada en el configurador de la barra lateral (ej. `webcal://tu-dominio.com/api/calendar`).
2. Entra a tu [Google Calendar](https://calendar.google.com).
3. En el panel lateral izquierdo, junto a "Otros calendarios", haz clic en el botón **`+`** y selecciona **Desde URL**.
4. Pega la dirección URL copiada y haz clic en **Añadir calendario**.

#### 2. En Apple Calendar (iPhone, iPad, Mac)
1. Haz clic directamente en el botón **"Suscribirse"** de la página web desde tu dispositivo Apple.
2. El sistema operativo te solicitará permiso para abrir la aplicación nativa de calendario.
3. Acepta y configura el color, las notificaciones y la frecuencia de actualización del feed de suscripción.

#### 3. En Microsoft Outlook / Outlook.com
1. Entra a tu aplicación de correo o versión web de Outlook.
2. Ve al panel de Calendario, haz clic en **Agregar Calendario** y elige la opción **Suscribirse desde la Web**.
3. Pega la URL del feed y asígnale un nombre (ej: "Mundial FIFA 2026") y un icono para identificarlo fácilmente.

---

## 🏗️ Estructura del Código

La arquitectura del proyecto está organizada de forma limpia dentro del directorio `src/`:

```
calendario_mundial_2026/
├── public/                 # Recursos gráficos públicos del sitio
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── calendar/   # GET /api/calendar - Generador y feed del archivo .ics
    │   │   └── matches/    # GET/POST/DELETE /api/matches - Conexión de BD y simulador
    │   ├── globals.css     # Estilos globales y paleta de colores oficiales FIFA 2026
    │   ├── layout.tsx      # Estructura del documento HTML, fuentes y metadatos base
    │   ├── page.module.css # Estilos modulares del dashboard y vistas responsivas
    │   └── page.tsx        # Componente de la página principal (React Client Component)
    ├── data/
    │   ├── matches.json    # Información base de los 104 partidos del fixture
    │   ├── stadiums.json   # Detalles de los 16 estadios oficiales y husos horarios
    │   └── teams.json      # Información de las selecciones y enlaces a banderas PNG
    └── lib/
        ├── db.ts           # Controlador de base de datos local y lectura de la API en vivo
        ├── ical.ts         # Motor generador del archivo iCalendar (RFC 5545)
        └── utils.ts        # Traducciones al español,offsets de estadios y utilidades de fechas
```

---

## 🔒 Licencia

Este proyecto está diseñado para propósitos informativos y recreativos relacionados con el Mundial de Fútbol 2026. Todos los nombres de equipos, estadios y marcas de la FIFA pertenecen a sus respectivos dueños.
