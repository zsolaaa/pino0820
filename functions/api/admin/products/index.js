import { listProducts } from "../../../_lib/db.js";
import { jsonResponse, errorResponse } from "../../../_lib/json.js";
import { requireAdmin } from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const products = await listProducts(env, { includeUnavailable: true });
    return jsonResponse({ products });
  } catch {
    return errorResponse("Nem sikerült betölteni a termékeket.", 500);
  }
}
