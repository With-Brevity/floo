import * as queries from "@/db/queries";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const apiKey = queries.getApiKey();
  const connections = queries.getConnections();

  return (
    <SettingsClient
      initialApiKey={apiKey}
      connections={connections}
    />
  );
}
