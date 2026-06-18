// api/tiendanube-products.js
// Lista todos los productos (con variantes) de la tienda conectada.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return res.status(401).json({ error: 'Falta autenticacion' });
  }
  try {
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
      return res.status(500).json({ error: 'Error consultando la conexion en Supabase', detalle: errText });
    }
    const connections = await connRes.json();
    const conn = connections?.[0];
    if (!conn) {
      return res.status(404).json({ error: 'Tienda Nube no conectada' });
    }

    let allProducts = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 30) {
      const prodRes = await fetch(
        `https://api.tiendanube.com/v1/${conn.store_id}/products?per_page=50&page=${page}`,
        {
          headers: {
            'Authentication': `bearer ${conn.access_token}`,
            'User-Agent': 'GOTIX (contacto@gotix.app)',
          },
        }
      );
      if (!prodRes.ok) {
        const errBody = await prodRes.text();
        return res.status(502).json({ error: `Tienda Nube respondio con error ${prodRes.status}`, detalle: errBody });
      }
      const products = await prodRes.json();
      if (!Array.isArray(products) || products.length === 0) {
        hasMore = false;
      } else {
        allProducts = allProducts.concat(products);
        page++;
        if (products.length < 50) hasMore = false;
      }
    }

    // Achatamos a nivel variante, que es donde tiene sentido cargar el costo
    const items = [];
    allProducts.forEach(p => {
      const name = p.name?.es || p.name?.pt || Object.values(p.name || {})[0] || 'Sin nombre';
      const img = p.images?.[0]?.src || '';
      (p.variants || []).forEach(v => {
        const values = (v.values || []).map(val => val.es || val.pt || Object.values(val)[0]).filter(Boolean).join(' / ');
        items.push({
          product_id: p.id,
          variant_id: v.id,
          sku: v.sku || '',
          product_name: name,
          variant_name: values,
          price: parseFloat(v.price || 0),
          stock: v.stock,
          image: img,
        });
      });
    });

    res.status(200).json({ items, total: items.length });
  } catch (err) {
    console.error('Error en tiendanube-products:', err);
    res.status(500).json({ error: err.message });
  }
}
