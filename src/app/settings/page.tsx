import * as queries from "@/db/queries";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const sessionToken = queries.getSessionToken();
  const connections = queries.getConnections();
  const email = queries.getSetting("user_email");
  const name = queries.getSetting("user_name");
  const subscriptionStatus =
    queries.getSetting("subscription_status") || "none";

  return (
    <SettingsClient
      isSignedIn={sessionToken !== null}
      email={email}
      name={name}
      subscriptionStatus={subscriptionStatus}
      connections={connections}
    />
  );
}
