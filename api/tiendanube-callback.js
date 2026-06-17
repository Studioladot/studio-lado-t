// api/tiendanube-callback.js
// Recibe el "code" que Tienda Nube manda despues de que el usuario autoriza,
// lo cambia por un access_token, y lo guarda en Supabase asociado al usuario de GOTIX.
//
// Variables de entorno necesarias en Vercel (Settings → Environment Variables):
//   TIENDANUBE_CLIENT_ID      = 34513
//   TIENDANUBE_CLIENT_SECRET  = f55267d186bb3f9892d14b1e54e8337b19ef9a4e6df5b323
//   SUPABASE_URL              = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = (la "service_role" key de Supabase, NO la anon key)
//
// La service_role key se encuentra en Supabase → Project Settings → API → service_role.
// Esta key puede escribir en cualquier tabla ignorando RLS, por eso es indispensable
// que SOLO viva como variable de entorno en Vercel y nunca en el HTML.

export default async function handler(req, res) {
  const { code, state } = req.query; // state = user_id de Supabase (el de GOTIX)

  if (!code || !state) {
    return res.status(400).send('Falta el codigo de autorizacion o el state.');
  }

  try {
    // 1. Intercambiar el code por un access_token
    const tokenRes = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.TIENDANUBE_CLIENT_ID,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('TiendaNube token error:', tokenData);
      return res.status(400).send('No se pudo conectar con Tienda Nube: ' + JSON.stringify(tokenData));
    }

    const { access_token, user_id: store_id } = tokenData;
    // Nota: Tienda Nube llama "user_id" al ID de la tienda. No confundir con el user_id de GOTIX.

    // 2. Traer info basica de la tienda (nombre, url) para mostrarla en GOTIX
    let storeName = '';
    let storeUrl = '';
    try {
      const storeRes = await fetch(`https://api.tiendanube.com/v1/${store_id}/store`, {
        headers: {
          'Authentication': `bearer ${access_token}`,
          'User-Agent': 'GOTIX (contacto@gotix.app)',
        },
      });
      const storeData = await storeRes.json();
      storeName = storeData?.name?.es || storeData?.name || '';
      storeUrl = storeData?.url || '';
    } catch (e) {
      console.warn('No se pudo traer info de la tienda:', e.message);
    }

    // 3. Guardar la conexion en Supabase (upsert por user_id de GOTIX)
    const supabaseRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/tiendanube_connections`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_id: state,
          store_id: String(store_id),
          access_token,
          store_name: storeName,
          store_url: storeUrl,
        }),
      }
    );

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      console.error('Error guardando en Supabase:', errText);
      return res.status(500).send('Se conecto con Tienda Nube pero no se pudo guardar. Avisale a soporte.');
    }

    // 4. Redirigir de vuelta a la app con un mensaje de exito
    res.redirect(302, '/?tn_connected=1');
  } catch (err) {
    console.error('Error en tiendanube-callback:', err);
    res.status(500).send('Error inesperado conectando Tienda Nube: ' + err.message);
  }
}
