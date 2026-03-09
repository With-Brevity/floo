"use server";

import { ApiClient } from "@/lib/api";
import { syncConnection, syncAllConnections } from "@/lib/sync";
import * as queries from "@/db/queries";
import { revalidatePath } from "next/cache";

export async function claimApiKeyAction(sessionId: string) {
  const { claimApiKey } = await import("@/lib/api");
  const result = await claimApiKey(sessionId);
  queries.setApiKey(result.apiKey);
  revalidatePath("/settings");
  return result;
}

export async function saveApiKeyAction(apiKey: string) {
  queries.setApiKey(apiKey);
  revalidatePath("/settings");
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
  const apiKey = queries.getApiKey();
  if (!apiKey) throw new Error("No API key configured");

  const client = new ApiClient(apiKey);
  await syncConnection(client, connectionId);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/investments");
}

export async function syncAllAction() {
  const apiKey = queries.getApiKey();
  if (!apiKey) throw new Error("No API key configured");

  const client = new ApiClient(apiKey);
  const results = await syncAllConnections(client);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/investments");
  return results;
}

export async function openBillingPortalAction(returnUrl: string) {
  const apiKey = queries.getApiKey();
  if (!apiKey) throw new Error("No API key configured");

  const client = new ApiClient(apiKey);
  return client.createPortalSession(returnUrl);
}

export async function getApiKeyAction() {
  return queries.getApiKey();
}

export async function clearAllDataAction() {
  queries.clearAllData();
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}
