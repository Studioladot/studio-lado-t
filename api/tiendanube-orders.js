// api/tiendanube-orders.js
// Acepta ?from=YYYY-MM-DD&to=YYYY-MM-DD como query params.
// Si no se pasan, usa los ultimos 30 dias por defecto (comportamiento anterior).
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
    const connRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/tiendanube_connections?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!connRes.ok) {
      const errText = await connRes.text();
      console.error('Error consultando tiendanube_connections:', connRes.status, errText);
      return res.status(500).json({ error: 'Error consultando la conexion en Supabase', detalle: errText });
    }
    const connections = await connRes.json();
    const conn = connections?.[0];
    if (!conn) {
      return res.status(404).json({ error: 'Tienda Nube no conectada' });
    }

    // 3. Resolver el rango de fechas: personalizado (from/to) o ultimos 30 dias por defecto
    const { from, to } = req.query;
    let sinceISO, untilISO;
    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00`);
      const toDate = new Date(`${to}T23:59:59`);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Fechas invalidas. Formato esperado: YYYY-MM-DD' });
      }
      sinceISO = fromDate.toISOString();
      untilISO = toDate.toISOString();
    } else {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      sinceISO = since.toISOString();
      untilISO = new Date().toISOString();
    }

    // 4. Traer las ordenes del rango elegido
    let allOrders = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 20) {
      const ordersRes = await fetch(
        `https://api.tiendanube.com/v1/${conn.store_id}/orders?created_at_min=${sinceISO}&created_at_max=${untilISO}&per_page=50&page=${page}`,
        {
          headers: {
            'Authentication': `bearer ${conn.access_token}`,
            'User-Agent': 'GOTIX (contacto@gotix.app)',
          },
        }
      );
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

    // 5. Calcular bruto, envio y neto. Tambien armamos detalle de productos vendidos para calcular COGS.
    let bruto = 0;
    let envio = 0;
    const lineItems = [];
    allOrders.forEach((order) => {
      const paymentStatus = order.payment_status;
      const orderStatus = order.status;
      if (paymentStatus !== 'paid' || orderStatus === 'cancelled') return;
      const subtotal = parseFloat(order.subtotal || 0);
      const discount = parseFloat(order.discount || 0);
      const shippingCost = parseFloat(order.shipping_cost_customer || 0);
      bruto += (subtotal - discount) + shippingCost;
      envio += shippingCost;
      (order.products || []).forEach(it => {
        lineItems.push({
          variant_id: it.variant_id,
          product_id: it.product_id,
          name: it.name,
          qty: parseInt(it.quantity || 1),
          price: parseFloat(it.price || 0),
        });
      });
    });
    const neto = bruto - envio;

    res.status(200).json({
      bruto: Math.round(bruto),
      envio: Math.round(envio),
      neto: Math.round(neto),
      ordenes: allOrders.length,
      line_items: lineItems,
      periodo: { desde: sinceISO, hasta: untilISO },
    });
  } catch (err) {
    console.error('Error en tiendanube-orders:', err);
    res.status(500).json({ error: err.message });
  }
}
