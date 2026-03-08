export const TEST_USER = {
  id: "user-uuid-1234",
  email: "test@example.com",
  stripeCustomerId: "cus_test123",
  apiKey: "fin_testapikey1234567890abcdef",
  credits: 1,
  createdAt: new Date("2025-01-01"),
};

export const TEST_PAYMENT = {
  id: "payment-uuid-1234",
  userId: TEST_USER.id,
  stripeSessionId: "cs_test_session_123",
  amount: 300,
  status: "completed",
  createdAt: new Date("2025-01-01"),
};

export const PLAID_TRANSACTION = {
  transaction_id: "txn_1",
  account_id: "acc_1",
  amount: 25.5,
  date: "2025-01-15",
  name: "Coffee Shop",
  merchant_name: "Starbucks",
  category: ["Food and Drink", "Coffee Shop"],
  pending: false,
  iso_currency_code: "USD",
};

export const PLAID_ACCOUNT = {
  account_id: "acc_1",
  name: "Checking",
  official_name: "Personal Checking",
  type: "depository",
  subtype: "checking",
  mask: "1234",
  balances: {
    current: 1000,
    available: 950,
    iso_currency_code: "USD",
  },
};

export const PLAID_HOLDING = {
  account_id: "acc_1",
  security_id: "sec_1",
  quantity: 10,
  cost_basis: 100,
  institution_value: 150,
  iso_currency_code: "USD",
};

export const PLAID_SECURITY = {
  security_id: "sec_1",
  name: "Apple Inc",
  ticker_symbol: "AAPL",
  type: "equity",
  close_price: 15,
  close_price_as_of: "2025-01-15",
  iso_currency_code: "USD",
};
