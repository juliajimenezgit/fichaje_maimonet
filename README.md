# Maimonet

Aplicación web para gestionar proyectos, registrar horas, calcular importes y controlar pagos para trabajos freelance.

## Acceso local

Crea un archivo `.env.local` en la raíz del proyecto y define las credenciales:

```env
VITE_LOGIN_USER=tu_usuario
VITE_LOGIN_PASSWORD=tu_contraseña
```

Ese archivo está excluido por `.gitignore`. Reinicia el servidor de desarrollo después de modificarlo. El acceso se mantiene mientras la pestaña siga abierta y puedes cerrarlo desde el botón de salida.

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
- Persistencia con localStorage.
- Configuración y backup/restore en JSON.
