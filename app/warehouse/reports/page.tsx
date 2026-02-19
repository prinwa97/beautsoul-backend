import { prisma } from "@/lib/prisma";

export default async function WarehouseReportsPage() {
  // Total stock
  const totalAgg = await prisma.stockLot.aggregate({
    _sum: { qtyOnHandPcs: true },
    where: { ownerType: "COMPANY" },
  });
  const totalStock = totalAgg._sum.qtyOnHandPcs || 0;

  // Total batches
  const totalBatches = await prisma.stockLot.count({
    where: { ownerType: "COMPANY" },
  });

  // Low stock products (<50 pcs total per product)
  const productTotals = await prisma.stockLot.groupBy({
    by: ["productName"],
    where: { ownerType: "COMPANY" },
    _sum: { qtyOnHandPcs: true },
  });

  const lowStockCount = productTotals.filter(p => (p._sum.qtyOnHandPcs || 0) < 50).length;

  // Expiring in 30 days
  const d30 = new Date();
  d30.setDate(d30.getDate() + 30);

  const expiringCount = await prisma.stockLot.count({
    where: {
      ownerType: "COMPANY",
      qtyOnHandPcs: { gt: 0 },
      expDate: { not: null, lte: d30 },
    },
  });

  // Top 10 products by stock
  const topProducts = await prisma.stockLot.groupBy({
    by: ["productName"],
    where: { ownerType: "COMPANY" },
    _sum: { qtyOnHandPcs: true },
    orderBy: { _sum: { qtyOnHandPcs: "desc" } },
    take: 10,
  });

  // Expiring batch list
  const expiringBatches = await prisma.stockLot.findMany({
    where: {
      ownerType: "COMPANY",
      qtyOnHandPcs: { gt: 0 },
      expDate: { not: null, lte: d30 },
    },
    orderBy: { expDate: "asc" },
    take: 20,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Warehouse Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Stock (pcs)" value={totalStock}/>
        <Card title="Total Batches" value={totalBatches}/>
        <Card title="Low Stock Products" value={lowStockCount}/>
        <Card title="Expiring in 30 Days" value={expiringCount}/>
      </div>

      {/* Top products table */}
      <div className="border rounded-2xl p-4 bg-white shadow-sm">
        <div className="font-semibold mb-3">Top Products by Stock</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Product</th>
              <th className="py-2">Total Qty (pcs)</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map(p => (
              <tr key={p.productName} className="border-b">
                <td className="py-2">{p.productName}</td>
                <td className="py-2 font-semibold">{p._sum.qtyOnHandPcs || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expiring batches table */}
      <div className="border rounded-2xl p-4 bg-white shadow-sm">
        <div className="font-semibold mb-3">Expiring Batches (30 days)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Product</th>
              <th className="py-2">Batch</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {expiringBatches.map(b => (
              <tr key={b.id} className="border-b">
                <td className="py-2">{b.productName}</td>
                <td className="py-2">{b.batchNo}</td>
                <td className="py-2 font-semibold">{b.qtyOnHandPcs}</td>
                <td className="py-2">
                  {b.expDate ? new Date(b.expDate).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
            {expiringBatches.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-gray-600">
                  No expiring batches found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({title,value}:{title:string,value:number}){
  return (
    <div className="border rounded-2xl p-4 bg-white shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
