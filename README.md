# Worldy · gastos de viaje

App web instalable en el celular (PWA) para controlar los gastos de un viaje por destino:
presupuesto personal por ciudad o país, alertas al 80 % y por ritmo diario, reasignación de
presupuesto entre destinos, compra de moneda local con promedio de cambio, gastos divididos
con el grupo y resumen final del viaje.

**Tecnología:** React + TypeScript (Vite) · Supabase (base de datos e inicio de sesión con Google) · Vercel (publicación).

Sin las claves de Supabase, la app funciona en **modo demo**, con un viaje de ejemplo guardado en el dispositivo.

---

## Puesta en marcha

### 1. Supabase (base de datos)

1. Entra a [supabase.com](https://supabase.com) → **New project**. Nombre: `worldy`. Región: *South America (São Paulo)*. Guarda la contraseña.
2. Cuando termine de crearse: menú izquierdo **SQL Editor** → **New query** → pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Debe decir *Success*.
3. **Project Settings → API**: copia el **Project URL** y la clave **anon public**. Las vas a usar en Vercel.

### 2. Inicio de sesión con Google

1. En [console.cloud.google.com](https://console.cloud.google.com) crea un proyecto → **APIs y servicios → Pantalla de consentimiento de OAuth** → tipo *Externo* → completa nombre de la app (Worldy) y tu correo → guarda.
2. **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo *Aplicación web*.
   - En **URI de redireccionamiento autorizados** pega: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     (está en Supabase → Authentication → Sign In / Providers → Google, campo *Callback URL*).
3. Copia el **ID de cliente** y el **Secreto**.
4. En Supabase → **Authentication → Sign In / Providers → Google** → activa, pega ID y secreto → guarda.
5. En la pantalla de consentimiento de Google, pasa la app a **En producción** (o agrega a tus amigos como *usuarios de prueba*).

### 3. Vercel (publicación)

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio `worldy` de GitHub.
2. Antes de **Deploy**, abre **Environment Variables** y agrega:
   - `VITE_SUPABASE_URL` = el Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = la clave anon public
3. **Deploy**. Vercel te da una dirección como `https://worldy-xxxx.vercel.app`.
4. Vuelve a Supabase → **Authentication → URL Configuration**:
   - **Site URL**: tu dirección de Vercel
   - **Redirect URLs**: agrega `https://tu-direccion.vercel.app/**`

### 4. Instalar en el celular

- **iPhone (Safari):** abre la dirección → botón Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome):** abre la dirección → menú ⋮ → *Instalar app*.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa las claves (o déjalo sin claves para el modo demo)
npm run dev
```

## Cómo calcula

- **Presupuesto en destino:** lo que planeas gastar estando en cada lugar. No incluye **pasajes** entre países ni **alojamiento reservado antes del viaje**; el alojamiento pagado durante el viaje sí se descuenta.
- **Costo total:** suma todo (pasajes + alojamientos + gastos en destino), solo tu parte.
- **Alertas:** al llegar al 80 % del destino actual, al pasarse, o si el ritmo diario indica que te vas a pasar. Sugiere mover la diferencia desde el próximo destino con presupuesto libre (o uno ya visitado con sobrante).
- **Moneda:** pagos con tarjeta usan lo debitado en USD (si lo cargas) o el cambio del día; pagos en efectivo usan el **promedio** de tus compras de esa moneda.
- **Grupo:** la ruta se comparte; cada viajero tiene su propio presupuesto. Los destinos personales solo los ve quien los creó.
