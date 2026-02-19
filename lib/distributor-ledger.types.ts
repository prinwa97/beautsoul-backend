export type RetailerRow = {
  id: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  gst?: string | null;
  status?: string | null;
};

export type LedgerEntry = {
  id: string;
  retailerId: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  note?: string | null;
  refNo?: string | null;
  createdAt: string;
};

export type RetailerLedgerResp = {
  retailer: { id: string; name: string; phone?: string | null; city?: string | null; state?: string | null };
  openingBalance?: number;
  totalDebit?: number;
  totalCredit?: number;
  closingBalance?: number;
  due?: number;
  entries: LedgerEntry[];
};

export type Msg = { type: "ok" | "err"; text: string } | null;
