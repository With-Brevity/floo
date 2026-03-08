import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function validateApiKey(request: Request) {
  const db = getDb();
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.apiKey, apiKey))
    .limit(1);

  return user ?? null;
}

export function corsResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin":
        process.env.ALLOWED_ORIGIN || "http://localhost:3000",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":
        process.env.ALLOWED_ORIGIN || "http://localhost:3000",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
