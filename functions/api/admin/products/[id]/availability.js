import { jsonResponse, errorResponse } from "../../../../_lib/json.js";
import { requireAdmin } from "../../../../_lib/auth.js";

export async function onRequestPatch({ request, env, params }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const productId = parseInt(params.id, 10);
  if (!Number.isInteger(productId)) return errorResponse("Érvénytelen termékazonosító.", 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  if (typeof body.is_available !== "boolean") {
    return errorResponse("Érvénytelen elérhetőség érték.", 400);
  }

  const result = await env.DB.prepare(
    "UPDATE products SET is_available = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(body.is_available ? 1 : 0, productId)
    .run();

  if (result.meta.changes === 0) {
    return errorResponse("Termék nem található.", 404);
  }

  return jsonResponse({ ok: true, product: { id: productId, is_available: body.is_available } });
}
