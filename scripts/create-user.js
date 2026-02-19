const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const phone = "9316690001";
  const password = "Rinwa123";
  const role = "SALES_MANAGER";

  const passwordHash = await bcrypt.hash(password, 10);

  // check if user already exists
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log("❌ User already exists with phone:", phone);
    return;
  }

  const user = await prisma.user.create({
    data: {
      phone,
      role,
      passwordHash,
    },
  });

  console.log("✅ USER CREATED SUCCESSFULLY");
  console.log({
    id: user.id,
    phone: user.phone,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error("❌ ERROR:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

