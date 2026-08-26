import { listProducts } from "../_lib/db.js";
import { jsonResponse, errorResponse } from "../_lib/json.js";

export async function onRequestGet({ env }) {
  try {
    const products = await listProducts(env);
    return jsonResponse({ products });
  } catch (err) {
    return errorResponse("Nem sikerült betölteni a termékeket.", 500);
  }
}
