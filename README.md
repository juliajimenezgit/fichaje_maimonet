# Maimonet

Aplicación web para gestionar proyectos, registrar horas, calcular importes y controlar pagos para trabajos freelance.

## Acceso local

Crea un archivo `.env.local` en la raíz del proyecto y define las credenciales:

```env
VITE_LOGIN_USER=tu_usuario
VITE_LOGIN_PASSWORD=tu_contraseña
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
```

Reinicia el servidor de desarrollo después de modificarlo. El acceso se mantiene mientras la pestaña siga abierta y puedes cerrarlo desde el botón de salida.

Localhost y la aplicación desplegada deben apuntar al mismo proyecto de Supabase. Se admite también `VITE_SUPABASE_ANON_KEY` para despliegues que ya utilizan la clave pública antigua. Nunca uses una clave secreta en variables `VITE_*`: se incluyen en el navegador.

Los proyectos, tareas y fichajes se leen y guardan exclusivamente en la fila `id = app` de la tabla `app_state`. Al abrir la aplicación se eliminan las tres claves antiguas de fichajes de localStorage; no se importan ni se suben a Supabase. No hay datos precargados ni guardados automáticos al cargar. Si falla la lectura, se bloquea la edición y se permite reintentar. Si falla un guardado, se indica en pantalla y los cambios permanecen solo en memoria hasta reintentarlo; recargar o cerrar la página los descarta.

El tema visual sigue siendo una preferencia local. Los archivos PDF adjuntos siguen usando IndexedDB; esta configuración de Supabase guarda sus referencias, no los archivos.

## Requisitos

- Node.js 18+
- npm

## Instalar dependencias

```bash
npm install
```

## Ejecutar en modo desarrollo

```bash
npm run dev
```

## Construir para producción

```bash
npm run build
```

## Funcionalidades incluidas

- Dashboard con resumen mensual y de horas.
- Gestión de proyectos y tareas.
- Registro manual y por temporizador.
- Cálculo de importes y pagos.
- Persistencia de proyectos, tareas y fichajes en Supabase.

## Comprobaciones

```bash
npm test
npm run build
```
