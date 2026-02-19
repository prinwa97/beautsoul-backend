// app/field-officer/collection/page.tsx
import CollectionClient from "./collection-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  return <CollectionClient />;
}