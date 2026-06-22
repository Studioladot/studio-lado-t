// api/tiendanube-orders.js
// Acepta ?from=YYYY-MM-DD&to=YYYY-MM-DD como query params.
// Si no se pasan, usa los ultimos 30 dias por defecto (comportamiento anterior).
// Corre en Edge Runtime: arranca en milisegundos, sin cold-start de Node.
export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req) {
  const url = new URL(req.url);
  const authHeader = req.headers.get('authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return json({ error: 'Falta autenticacion' }, 401);
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
      return json({ error: 'Sesion invalida' }, 401);
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
      return json({ error: 'Error consultando la conexion en Supabase', detalle: errText }, 500);
    }
    const connections = await connRes.json();
    const conn = connections?.[0];
    if (!conn) {
      return json({ error: 'Tienda Nube no conectada' }, 404);
    }

    // 3. Resolver el rango de fechas: personalizado (from/to) o ultimos 30 dias por defecto
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const wantAdvanced = url.searchParams.get('advanced') === '1';
    let sinceISO, untilISO;
    if (from && to) {
      // Ancla explicitamente a horario Argentina (UTC-3), independiente de en
      // que timezone corra la funcion.
      const fromDate = new Date(`${from}T00:00:00-03:00`);
      const toDate = new Date(`${to}T23:59:59-03:00`);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return json({ error: 'Fechas invalidas. Formato esperado: YYYY-MM-DD' }, 400);
      }
      sinceISO = fromDate.toISOString();
      untilISO = toDate.toISOString();
    } else {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      sinceISO = since.toISOString();
      untilISO = new Date().toISOString();
    }

    // 4. Lanzar checkouts/productos en paralelo con la paginacion de ordenes
    // (antes se esperaban en secuencia DESPUES de terminar las ordenes).
    const checkoutsPromise = wantAdvanced
      ? fetch(`https://api.tiendanube.com/v1/${conn.store_id}/checkouts?created_at_min=${sinceISO}&created_at_max=${untilISO}&per_page=50`,
          { headers: { 'Authentication': `bearer ${conn.access_token}`, 'User-Agent': 'GOTIX (contacto@gotix.app)' } })
          .then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([]);
    const productsPromise = wantAdvanced
      ? fetch(`https://api.tiendanube.com/v1/${conn.store_id}/products?published=true&per_page=50`,
          { headers: { 'Authentication': `bearer ${conn.access_token}`, 'User-Agent': 'GOTIX (contacto@gotix.app)' } })
          .then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([]);

    // 5. Traer las ordenes del rango elegido
    let allOrders = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 20) {
      const ordersRes = await fetch(
        `https://api.tiendanube.com/v1/${conn.store_id}/orders?created_at_min=${sinceISO}&created_at_max=${untilISO}&per_page=200&page=${page}`,
        {
          headers: {
            'Authentication': `bearer ${conn.access_token}`,
            'User-Agent': 'GOTIX (contacto@gotix.app)',
          },
        }
      );
      if (!ordersRes.ok) {
        if (ordersRes.status === 404) {
          hasMore = false;
          break;
        }
        const errBody = await ordersRes.text();
        console.error('Tienda Nube API error:', ordersRes.status, errBody);
        return json({
          error: `Tienda Nube respondio con error ${ordersRes.status}`,
          detalle: errBody,
          store_id: conn.store_id,
        }, 502);
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

    // 5b. Deduplicar por ID
    const seenIds = new Set();
    allOrders = allOrders.filter(o => {
      if (seenIds.has(o.id)) return false;
      seenIds.add(o.id);
      return true;
    });

    // 6. Venta valida = status 'paid' O payment_status 'paid', excluyendo cancelled.
    const paidOrders = allOrders.filter(order =>
      (order.status === 'paid' || order.payment_status === 'paid') && order.status !== 'cancelled'
    );

    let bruto = 0;
    let envio = 0;
    const lineItems = [];
    const ordersOut = [];
    const byDay = {};
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
    if (wantAdvanced) {
      const [checkouts, productos] = await Promise.all([checkoutsPromise, productsPromise]);
      carritosAbandonados = Array.isArray(checkouts) ? checkouts.length : 0;

      const porProducto = {};
      lineItems.forEach(li => {
        const key = li.product_id;
        if (!porProducto[key]) porProducto[key] = { name: li.name, unidades: 0, facturacion: 0 };
        porProducto[key].unidades += li.qty;
        porProducto[key].facturacion += li.qty * li.price;
      });
      topProductos = Object.values(porProducto).sort((a, b) => b.facturacion - a.facturacion).slice(0, 5);

      const vendidosIds = new Set(Object.keys(porProducto).map(Number));
      productosMuertos = (Array.isArray(productos) ? productos : []).filter(p => !vendidosIds.has(p.id)).slice(0, 10)
        .map(p => ({ name: p.name?.es || p.name || 'Producto', diasSinVentas: '30+' }));
    }

    return json({
      bruto: Math.round(bruto),
      envio: Math.round(envio),
      neto: Math.round(neto),
      ordenes: paidOrders.length,
      carritosAbandonados,
      topProductos,
      productosMuertos,
      orders: ordersOut.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      line_items: lineItems,
      serie_diaria: serieDiaria,
      periodo: { desde: sinceISO, hasta: untilISO },
    });
  } catch (err) {
    console.error('Error en tiendanube-orders:', err);
    return json({ error: err.message }, 500);
  }
}
