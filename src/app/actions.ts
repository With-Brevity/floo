"use server";

import { ApiClient } from "@/lib/api";
import { syncConnection, syncAllConnections } from "@/lib/sync";
import * as queries from "@/db/queries";
import { revalidatePath } from "next/cache";

export async function exchangeCodeAction(code: string) {
  const { exchangeCode } = await import("@/lib/api");
  const result = await exchangeCode(code);
  queries.setSessionToken(result.sessionToken);
  queries.setSetting("user_id", result.user.id);
  queries.setSetting("user_email", result.user.email);
  queries.setSetting("user_name", result.user.name);
  queries.setSetting(
    "subscription_status",
    result.user.subscriptionStatus
  );
  revalidatePath("/");
  revalidatePath("/settings");
  return result;
}

export async function saveConnectionAction(data: {
  id: string;
  accessToken: string;
  institutionId: string;
  institutionName: string;
}) {
  queries.upsertConnection(data);
  revalidatePath("/");
  revalidatePath("/accounts");
}

export async function deleteConnectionAction(id: string) {
  queries.deleteConnection(id);
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
}

export async function syncConnectionAction(connectionId: string) {
  const sessionToken = queries.getSessionToken();
  if (!sessionToken) throw new Error("Not signed in");

  const client = new ApiClient(sessionToken);
  await syncConnection(client, connectionId);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/investments");
}

export async function syncAllAction() {
  const sessionToken = queries.getSessionToken();
  if (!sessionToken) throw new Error("Not signed in");

  const client = new ApiClient(sessionToken);
  const results = await syncAllConnections(client);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/investments");
  return results;
}

export async function openBillingPortalAction(returnUrl: string) {
  const sessionToken = queries.getSessionToken();
  if (!sessionToken) throw new Error("Not signed in");

  const client = new ApiClient(sessionToken);
  return client.createPortalSession(returnUrl);
}

export async function getSessionAction() {
  const sessionToken = queries.getSessionToken();
  if (!sessionToken) return null;
  return {
    sessionToken,
    email: queries.getSetting("user_email"),
    name: queries.getSetting("user_name"),
    subscriptionStatus: queries.getSetting("subscription_status") || "none",
  };
}

export async function signOutAction() {
  queries.clearSession();
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function refreshSubscriptionAction() {
  const sessionToken = queries.getSessionToken();
  if (!sessionToken) throw new Error("Not signed in");

  const client = new ApiClient(sessionToken);
  const me = await client.getMe();
  queries.setSetting("subscription_status", me.subscriptionStatus);
  if (me.email) queries.setSetting("user_email", me.email);
  if (me.name) queries.setSetting("user_name", me.name);
  revalidatePath("/");
  revalidatePath("/settings");
  return me;
}

export async function clearAllDataAction() {
  queries.clearAllData();
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}
