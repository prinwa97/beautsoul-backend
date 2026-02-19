import InvoiceViewClient from "./invoice-view-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  // ✅ client will read useParams itself
  return <InvoiceViewClient />;
}
