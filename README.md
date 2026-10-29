# Panel Web - Trampa Inteligente Cogollera (ESP32 + Supabase)

Panel de control y monitoreo en tiempo real de capturas de plagas (gusano cogollero) mediante doble barrera óptica infrarroja y telemetría en la nube.

---

## 1. Configuración de Base de Datos en Supabase (Solo la primera vez)

1. Abre tu panel de control de Supabase:  
   👉 [https://supabase.com/dashboard/project/pqydjwpjclfnwfrzpsvb](https://supabase.com/dashboard/project/pqydjwpjclfnwfrzpsvb)
2. En la barra lateral izquierda, entra a **SQL Editor**.
3. Haz clic en **New query** (Nueva consulta).
4. Abre el archivo [`supabase_setup.sql`](./supabase_setup.sql), copia todo su contenido, pégalo en el editor y presiona **RUN**.
5. ¡Listo! Esto crea la tabla `mediciones`, habilita permisos de lectura/escritura pública para la trampa y activa la sincronización en tiempo real (*Supabase Realtime*).

---

## 2. Cómo abrir el Panel Web

No requiere instalar ningún servidor ni Node.js:
1. Haz **doble clic en `index.html`** para abrirlo en Chrome, Edge o tu navegador preferido.
2. Verás el indicador en verde: **"En Vivo (Supabase)"**.
3. Cada vez que el ESP32 detecte una cogollera en la trampa:
   * El contador aumentará automáticamente.
   * La tabla se actualizará de inmediato sin necesidad de recargar la página.
   * La pantalla parpadeará en verde sutilmente para avisar de la nueva captura.

