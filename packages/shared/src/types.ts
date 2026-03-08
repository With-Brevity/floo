// ---- Server API Types ----

export interface ApiError {
  error: string;
}

export interface VerifyResponse {
  valid: boolean;
  credits: number;
  email: string;
}

export interface ClaimResponse {
  apiKey: string;
  email: string;
  credits: number;
}

export interface CheckoutResponse {
  url: string;
}

export interface LinkTokenResponse {
  linkToken: string;
}

export interface ExchangeTokenRequest {
  publicToken: string;
  institutionId: string;
  institutionName: string;
}

export interface ExchangeTokenResponse {
  accessToken: string;
  itemId: string;
}

export interface TransactionsSyncRequest {
  accessToken: string;
  cursor?: string;
}

export interface TransactionsSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  nextCursor: string;
  hasMore: boolean;
}

export interface BalancesRequest {
  accessToken: string;
}

export interface BalancesResponse {
  accounts: PlaidAccount[];
}

export interface InvestmentsRequest {
  accessToken: string;
}

export interface InvestmentsResponse {
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  accounts: PlaidAccount[];
}

// ---- Plaid Data Types ----

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  pending: boolean;
  iso_currency_code: string | null;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string | null;
  };
}

export interface PlaidHolding {
  account_id: string;
  security_id: string;
  quantity: number;
  cost_basis: number | null;
  institution_value: number | null;
  iso_currency_code: string | null;
}

export interface PlaidSecurity {
  security_id: string;
  name: string | null;
  ticker_symbol: string | null;
  type: string | null;
  close_price: number | null;
  close_price_as_of: string | null;
  iso_currency_code: string | null;
}
