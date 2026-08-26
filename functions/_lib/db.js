function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    price: row.price,
    is_spicy: !!row.is_spicy,
    image_file: row.image_file,
    is_modifier_eligible: !!row.is_modifier_eligible,
  };
}

// Public listing: only available products, unless includeUnavailable is set (admin use).
export async function listProducts(env, { includeUnavailable = false } = {}) {
  const where = includeUnavailable ? "" : "WHERE is_available = 1";
  const { results } = await env.DB.prepare(
    `SELECT * FROM products ${where} ORDER BY category, sort_order`
  ).all();
  return results.map(mapProduct);
}

export async function getProductsByIds(env, ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT * FROM products WHERE id IN (${placeholders})`
  )
    .bind(...ids)
    .all();
  const map = new Map();
  for (const row of results) map.set(row.id, row);
  return map;
}
