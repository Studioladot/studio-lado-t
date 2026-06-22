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
    // sinceISO/untilISO son el rango REAL, filtrado sobre paid_at (fecha de pago).
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
    // La API de Tienda Nube solo filtra por created_at/updated_at, no por paid_at.
    // Por eso traemos con un margen extra hacia atras (60 dias) por created_at,
    // y despues filtramos en memoria por paid_at dentro del rango real.
    const fetchSinceDate = new Date(sinceISO);
    fetchSinceDate.setDate(fetchSinceDate.getDate() - 60);
    const fetchSinceISO = fetchSinceDate.toISOString();

    // 4. Traer las ordenes del rango elegido (con margen)
    let allOrders = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 20) {
      const ordersRes = await fetch(
        `https://api.tiendanube.com/v1/${conn.store_id}/orders?created_at_min=${fetchSinceISO}&created_at_max=${untilISO}&per_page=200&page=${page}`,
        {
          headers: {
            'Authentication': `bearer ${conn.access_token}`,
            'User-Agent': 'GOTIX (contacto@gotix.app)',
          },
        }
      );
      if (!ordersRes.ok) {
        if (ordersRes.status === 404) {
          // Tienda Nube devuelve 404 cuando se pide una pagina que ya no existe (ej. "Last page is 1")
          hasMore = false;
          break;
        }
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
        if (orders.length < 200) hasMore = false;
      }
    }

    // 5. Calcular bruto, envio y neto. Tambien armamos detalle por orden (para la tabla de "Ultimas ventas")
    //    y un array plano de line items (para COGS agregado del periodo, ya usado en Analisis).
// 1. Filtrar primero las ordenes pagadas, EXCLUYENDO las sin paid_at,
    // y verificando que la fecha de pago caiga dentro del rango real pedido.
    const sinceTime = new Date(sinceISO).getTime();
    const untilTime = new Date(untilISO).getTime();
    const paidOrders = allOrders.filter(order => {
      if (order.payment_status !== 'paid' || order.status === 'cancelled') return false;
      if (!order.paid_at) return false; // sin fecha de pago -> se excluye
      const paidTime = new Date(order.paid_at).getTime();
      if (isNaN(paidTime)) return false;
      return paidTime >= sinceTime && paidTime <= untilTime;
    });
    // ── DEBUG TEMPORAL ──────────────────────────────────────────────────────
    const debugOrders = allOrders.map(o => ({
      id: o.id,
      number: o.number,
      payment_status: o.payment_status,
      status: o.status,
      total: o.total,
      subtotal: o.subtotal,
      shipping_cost_customer: o.shipping_cost_customer,
      created_at: o.created_at,
    }));
    console.log('[DEBUG] total ordenes traidas de TN:', allOrders.length);
    console.log('[DEBUG] total ordenes paidOrders:', paidOrders.length);
    console.log('[DEBUG] detalle:', JSON.stringify(debugOrders, null, 2));
    // ── FIN DEBUG ────────────────────────────────────────────────────────────

    let bruto = 0;
    let envio = 0;
    const lineItems = [];
    const ordersOut = [];
    const byDay = {}; // { 'YYYY-MM-DD': { bruto, envio, ordenes } }
    paidOrders.forEach((order) => {
      const subtotal = parseFloat(order.subtotal || 0);
      const discount = parseFloat(order.discount || 0);
      const shippingCost = parseFloat(order.shipping_cost_customer || 0);
      const orderBruto = (subtotal - discount) + shippingCost;
      bruto += orderBruto;
      envio += shippingCost;
      const day = (order.created_at || '').substring(0, 10);
      if (day) {
        if (!byDay[day]) byDay[day] = { bruto: 0, envio: 0, ordenes: 0 };
        byDay[day].bruto += orderBruto;
        byDay[day].envio += shippingCost;
        byDay[day].ordenes += 1;
      }
      const orderLineItems = (order.products || []).map(it => ({
        variant_id: it.variant_id,
        product_id: it.product_id,
        name: it.name,
        qty: parseInt(it.quantity || 1),
        price: parseFloat(it.price || 0),
      }));
      orderLineItems.forEach(li => lineItems.push(li));
      ordersOut.push({
        id: order.id,
        number: order.number,
        created_at: order.created_at,
        total: Math.round(orderBruto),
        shipping_cost: Math.round(shippingCost),
        line_items: orderLineItems,
        payment_method: order.payment_details?.method || order.gateway || 'desconocido',
      });
    });
    const neto = bruto - envio;
    const serieDiaria = Object.keys(byDay).sort().map(day => ({
      fecha: day,
      bruto: Math.round(byDay[day].bruto),
      neto: Math.round(byDay[day].bruto - byDay[day].envio),
      ordenes: byDay[day].ordenes,
    }));
let carritosAbandonados = 0, topProductos = [], productosMuertos = [];
    if (req.query.advanced === '1') {
      try {
        const checkoutsRes = await fetch(
          `https://api.tiendanube.com/v1/${conn.store_id}/checkouts?created_at_min=${sinceISO}&created_at_max=${untilISO}&per_page=50`,
          { headers: { 'Authentication': `bearer ${conn.access_token}`, 'User-Agent': 'GOTIX (contacto@gotix.app)' } }
        );
        if (checkoutsRes.ok) {
          const checkouts = await checkoutsRes.json();
          carritosAbandonados = Array.isArray(checkouts) ? checkouts.length : 0;
        }
      } catch (e) { console.warn('checkouts error:', e.message); }

      const porProducto = {};
      lineItems.forEach(li => {
        const key = li.product_id;
        if (!porProducto[key]) porProducto[key] = { name: li.name, unidades: 0, facturacion: 0 };
        porProducto[key].unidades += li.qty;
        porProducto[key].facturacion += li.qty * li.price;
      });
      topProductos = Object.values(porProducto).sort((a,b)=>b.facturacion-a.facturacion).slice(0,5);

      try {
        const prodRes = await fetch(
          `https://api.tiendanube.com/v1/${conn.store_id}/products?published=true&per_page=50`,
          { headers: { 'Authentication': `bearer ${conn.access_token}`, 'User-Agent': 'GOTIX (contacto@gotix.app)' } }
        );
        if (prodRes.ok) {
          const productos = await prodRes.json();
          const vendidosIds = new Set(Object.keys(porProducto).map(Number));
          productosMuertos = productos.filter(p => !vendidosIds.has(p.id)).slice(0,10)
            .map(p => ({ name: p.name?.es || p.name || 'Producto', diasSinVentas: '30+' }));
        }
      } catch (e) { console.warn('productos error:', e.message); }
    }
   res.status(200).json({
     bruto: Math.round(bruto),
      envio: Math.round(envio),
      neto: Math.round(neto),
    ordenes: paidOrders.length,
      _debugOrders: debugOrders,
      carritosAbandonados,
      topProductos,
      productosMuertos,
      orders: ordersOut.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
      line_items: lineItems,
      serie_diaria: serieDiaria,
      periodo: { desde: sinceISO, hasta: untilISO },
    });
  } catch (err) {
    console.error('Error en tiendanube-orders:', err);
    res.status(500).json({ error: err.message });
  }
}
