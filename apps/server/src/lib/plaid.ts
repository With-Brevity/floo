import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

let _plaidClient: PlaidApi | null = null;

export function getPlaidClient() {
  if (!_plaidClient) {
    const config = new Configuration({
      basePath:
        PlaidEnvironments[
          (process.env.PLAID_ENV as keyof typeof PlaidEnvironments) || "sandbox"
        ],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
          "PLAID-SECRET": process.env.PLAID_SECRET!,
        },
      },
    });
    _plaidClient = new PlaidApi(config);
  }
  return _plaidClient;
}
