import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { getDb, schema } from "@/db";

export type UserRow = typeof schema.users.$inferSelect;

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

export const authMiddleware = createMiddleware<{
  Variables: { user: UserRow };
}>(async (c, next) => {
  const user = await validateApiKey(c.req.raw);
  if (!user) {
    return c.json({ error: "Invalid API key" }, 401);
  }
  c.set("user", user);
  await next();
});
