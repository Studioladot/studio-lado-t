// api/tiendanube-orders.js
// VERSION CORREGIDA: ahora detecta y reporta errores reales de la API de Tienda Nube
// en vez de devolver $0 en silencio cuando algo falla.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return res.status(401).json({ error: 'Falta autenticacion' });
  }
  try {
    // 1. Verificar el JWT contra Supabase y obtener el user_id
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${jwt}`,
      },
    });
    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Sesion invalida' });
    }

    // 2. Buscar la conexion de Tienda Nube de este usuario
    // Pedimos ordenado por created_at desc para asegurarnos de tomar la MAS RECIENTE
    // si por algun motivo hay mas de una fila para el mismo user_id.
    const connRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/tiendanube_connections?user_id=eq.${userId}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const connections = await connRes.json();
    const conn = connections?.[0];
    if (!conn) {
      return res.status(404).json({ error: 'Tienda Nube no conectada' });
    }

    // 3. Traer las ordenes de los ultimos 30 dias
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();
    let allOrders = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 10) {
      const ordersRes = await fetch(
        `https://api.tiendanube.com/v1/${conn.store_id}/orders?created_at_min=${sinceISO}&per_page=50&page=${page}`,
        {
          headers: {
            'Authentication': `bearer ${conn.access_token}`,
            'User-Agent': 'GOTIX (contacto@gotix.app)',
          },
        }
      );

      // FIX CLAVE: si la respuesta no es 2xx, no seguimos como si no hubiera nada.
      // Devolvemos el error real para poder diagnosticarlo.
      if (!ordersRes.ok) {
        const errBody = await ordersRes.text();
        console.error('Tienda Nube API error:', ordersRes.status, errBody);
        return res.status(502).json({
          error: `Tienda Nube respondio con error ${ordersRes.status}`,
          detalle: errBody,
          store_id: conn.store_id,
        });
      }

      const orders = await ordersRes.json();
      if (!Array.isArray(orders) || orders.length === 0) {
        hasMore = false;
      } else {
        allOrders = allOrders.concat(orders);
        page++;
        if (orders.length < 50) hasMore = false;
      }
    }

    // 4. Calcular bruto, envio y neto
    let bruto = 0;
    let envio = 0;
    allOrders.forEach((order) => {
      const paymentStatus = order.payment_status;
      const orderStatus = order.status;
      if (paymentStatus !== 'paid' || orderStatus === 'cancelled') return;
      const subtotal = parseFloat(order.subtotal || 0);
      const discount = parseFloat(order.discount || 0);
      const shippingCost = parseFloat(order.shipping_cost_customer || 0);
      bruto += (subtotal - discount) + shippingCost;
      envio += shippingCost;
    });
    const neto = bruto - envio;

    res.status(200).json({
      bruto: Math.round(bruto),
      envio: Math.round(envio),
      neto: Math.round(neto),
      ordenes: allOrders.length,
      ordenes_totales_traidas: allOrders.length, // antes de filtrar por 'paid'
      periodo: 'ultimos_30_dias',
    });
  } catch (err) {
    console.error('Error en tiendanube-orders:', err);
    res.status(500).json({ error: err.message });
  }
}
