import { prisma } from "./prisma";
import crypto from "crypto";

function genOrderNo(prefix = "RO") {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

async function main() {
  // 1) Retailer User (assuming User model exists + phone unique)
  const retailerUser = await (prisma as any).user.upsert({
    where: { phone: "9999999999" },
    update: {},
    create: {
      name: "Shree Medical Store",
      phone: "9999999999",
      role: "RETAILER",
      status: "ACTIVE",
    },
  });

  // 2) Retailer (unique by userId)
  const retailer = await prisma.retailer.upsert({
    where: { userId: retailerUser.id },
    update: {
      name: "Shree Medical Store",
      city: "Abohar",
      phone: "9999999999",
    } as any,
    create: {
      userId: retailerUser.id,
      name: "Shree Medical Store",
      phone: "9999999999",
      city: "Abohar",
      createdByRole: "ADMIN",
      createdById: "seed",
    } as any,
  });

  // 3) Products -> ProductCatalog ✅
  const p1 = await prisma.productCatalog.upsert({
    where: { id: "p_facewash" },
    update: {},
    create: {
      id: "p_facewash",
      name: "BeautSoul Facewash",
      size: "100ml",
      photoUrl: "https://picsum.photos/seed/facewash/120/120",
      hsn: "3304",
      gstRate: 18,
      pcsPerBox: 48,
    } as any,
  });

  const p2 = await prisma.productCatalog.upsert({
    where: { id: "p_sunscreen" },
    update: {},
    create: {
      id: "p_sunscreen",
      name: "BeautSoul Sunscreen Gel",
      size: "50g",
      photoUrl: "https://picsum.photos/seed/sunscreen/120/120",
      hsn: "3304",
      gstRate: 18,
      pcsPerBox: 36,
    } as any,
  });

  // 4) Order -> Order ✅
  const existing = await prisma.order.findFirst({
    where: { retailerId: retailer.id } as any,
    orderBy: { createdAt: "desc" } as any,
  });

  if (!existing) {
    await prisma.order.create({
      data: {
        retailerId: retailer.id,

        // If your Order model requires these, keep them:
        orderNo: genOrderNo("RO"),
        status: "SUBMITTED",

        // If Order requires createdByRole/createdById in your schema, uncomment:
        // createdByRole: "RETAILER",
        // createdById: retailerUser.id,

        items: {
          create: [
            // ⚠️ OrderItem me qty field name schema pe depend karta hai:
            // If it is qtyPcs -> keep qtyPcs
            // If it is qty -> change qtyPcs to qty
            { productId: p1.id, qtyPcs: 6, rate: 90 },
            { productId: p2.id, qtyPcs: 4, rate: 140 },
          ] as any,
        },
      } as any,
    });
  }

  console.log("✅ Seed done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });