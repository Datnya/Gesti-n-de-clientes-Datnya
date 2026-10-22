# Gestión de Clientes

Plataforma privada para gestionar clientes, accesos, renovaciones, ingresos, egresos y agenda. Preparada para publicarse como sitio estático en Vercel con datos en Supabase.

## Funciones incluidas

- **Clientes:** empresa, razón social, RUC, contacto, teléfono, correo, sitio web y notas.
- **Accesos:** cPanel, Namecheap, Gmail y cualquier otro servicio, con enlace, correo, usuario y contraseña cifrada.
- **Copiar:** botones junto a los datos del cliente y cada campo de acceso. La contraseña se copia solo con la caja fuerte desbloqueada.
- **Vencimientos:** hosting, dominio, soporte u otros; costo del proveedor, precio al cliente, moneda y periodicidad. Muestra avisos 30 días antes y ordena los pagos por fecha. Al marcar un servicio como pagado, registra el costo como egreso y mueve el siguiente vencimiento.
- **Resumen:** ingreso mensual **estimado** como precio periódico dividido entre los meses del período; ganancia anual estimada como precios menos costos. Estos números son proyecciones, separados de los movimientos reales.
- **Finanzas:** ingresos y egresos reales por categoría, cliente y moneda. PEN y USD se muestran por separado; no se convierten con un tipo de cambio.
- **Calendario:** vista mensual y anual, con vencimientos automáticos, eventos, entregas y tareas. Cada evento permite configurar cuántos días antes debe aparecer el aviso.
- **Perfil:** sube, cambia o elimina tu foto desde el avatar del menú. La foto se reduce a 256 × 256 píxeles y se guarda en una tabla privada de Supabase.
- **Sesión:** botón visible para cerrar sesión. Los tokens se guardan solo en la sesión de la pestaña y se eliminan al salir; volver a abrir el enlace muestra el inicio de sesión.

Los avisos aparecen **dentro de la plataforma al abrirla**. Esta versión no envía correos ni notificaciones cuando la plataforma está cerrada.

## Ejecutar localmente

La interfaz utiliza Poppins y una fotografía de [Daniil Komov en Unsplash](https://unsplash.com/photos/laptop-screen-displaying-code-with-orange-glow-e0SP7dk0dTw) para el acceso. La imagen se usa según la [licencia de Unsplash](https://unsplash.com/license).

El acceso acepta el usuario `datnya.monzon` o el correo personal invitado, con la contraseña que definas tú mediante la invitación de Supabase.

Requisitos: Node.js 20.19 o superior y npm.

```bash
npm install
npm run dev
```

Abre la dirección que indique Vite. En la configuración actual de Supabase, la URL de invitación local es `http://127.0.0.1:5173`, así que inicia el servidor con `npm run dev -- --host 127.0.0.1` antes de abrir esa invitación. Sin variables de entorno se muestra una **vista previa con datos ficticios**, que no guarda cambios.

## Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. En **SQL Editor**, ejecuta el archivo [`supabase/schema.sql`](supabase/schema.sql).
   Si ya habías aplicado una versión anterior del esquema, ejecuta solo [`supabase/profile_migration.sql`](supabase/profile_migration.sql) para habilitar la foto de perfil.
3. En **Authentication → URL Configuration**, configura la URL local de la aplicación. En **Authentication → Users**, envía una invitación a tu correo personal. El enlace abrirá la aplicación para que definas tu propia contraseña. Después, deshabilita el registro público en Supabase.
4. Copia `.env.example` a `.env.local` y completa la URL y la **publishable key** de tu proyecto:

   ```text
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. Reinicia `npm run dev` e inicia sesión con el correo invitado.

La publishable key puede estar en el navegador: la protección de datos depende de Supabase Auth y de las políticas RLS incluidas en el esquema. **Nunca pongas una service role key o secret key en variables `VITE_`**.

## Publicar con GitHub y Vercel

1. Crea un repositorio privado en GitHub y sube este directorio. `.gitignore` excluye `.env.local`, `node_modules` y `dist`.
2. Importa el repositorio en [Vercel](https://vercel.com/new). Detectará Vite; comando de compilación: `npm run build`; directorio de salida: `dist`.
3. Configura en Vercel las mismas dos variables de entorno de `.env.local` y despliega.
4. En Supabase, agrega la URL definitiva de Vercel a **Authentication → URL Configuration → Site URL**. Si más adelante utilizas enlaces de recuperación o invitación, agrega las URL correspondientes como redirect URLs.

No hay claves reales ni datos de clientes en el repositorio. Regístralos desde la aplicación después de configurar Supabase.

## Seguridad de accesos

La primera vez que agregues una contraseña, crea una **clave maestra** de al menos 12 caracteres. El navegador cifra cada contraseña con AES-GCM y una clave derivada con PBKDF2 antes de enviarla a Supabase. La clave maestra se mantiene solo en memoria durante la sesión y se borra al cerrar sesión o bloquear la caja fuerte. El correo, usuario, URL y notas del acceso no están cifrados; permanecen protegidos por Auth y RLS.

**Guarda la clave maestra fuera de esta aplicación. No se puede recuperar ni restablecer sin perder el acceso a las contraseñas cifradas.** Usa una contraseña diferente para iniciar sesión. Si una contraseña aparece en capturas o archivos compartidos, cámbiala en el servicio correspondiente antes de registrarla aquí.

Si copias una contraseña en un dispositivo compartido, recuerda que el portapapeles y su historial pertenecen al dispositivo y pueden conservarla después de cerrar sesión.

## Comprobación

```bash
npm run typecheck
npm run build
```
