const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function addDays(base, days) {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@drogamar.local')
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeNow!123';
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, status: 'ACTIVE' },
    create: { email, passwordHash, name, status: 'ACTIVE' },
  });

  const units = [
    ['UN', 'Unidade'],
    ['KG', 'Quilograma'],
    ['G', 'Grama'],
    ['L', 'Litro'],
    ['ML', 'Mililitro'],
    ['CX', 'Caixa'],
    ['PC', 'Peça'],
  ];
  for (const [code, label] of units) {
    await prisma.unitOfMeasure.upsert({
      where: { code },
      update: { label, active: true },
      create: { code, label, active: true },
    });
  }

  for (const categoryName of [
    'Matéria-prima',
    'Embalagens',
    'Produtos acabados',
    'Insumos',
  ]) {
    await prisma.stockCategory.upsert({
      where: { name: categoryName },
      update: { active: true },
      create: { name: categoryName, active: true },
    });
  }

  for (const brandName of ['Genérico', 'Própria', 'Terceiros']) {
    await prisma.stockBrand.upsert({
      where: { name: brandName },
      update: { active: true },
      create: { name: brandName, active: true },
    });
  }

  for (const locationName of [
    'Almoxarifado',
    'Farmácia',
    'Produção',
    'Quarentena',
  ]) {
    await prisma.stockLocation.upsert({
      where: { name: locationName },
      update: { active: true },
      create: { name: locationName, active: true },
    });
  }

  const unit = await prisma.unitOfMeasure.findUnique({ where: { code: 'UN' } });
  const category = await prisma.stockCategory.findUnique({
    where: { name: 'Matéria-prima' },
  });
  const brand = await prisma.stockBrand.findUnique({
    where: { name: 'Genérico' },
  });
  const almox = await prisma.stockLocation.findUnique({
    where: { name: 'Almoxarifado' },
  });
  const farmacia = await prisma.stockLocation.findUnique({
    where: { name: 'Farmácia' },
  });

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  const itemA = await prisma.stockItem.upsert({
    where: { code: 'ITM-VAL-001' },
    update: {
      description: 'Ácido Ascórbico',
      trackLot: true,
      trackExpiry: true,
      trackStock: true,
      costPrice: 12.5,
      salePrice: 28.9,
      status: 'ACTIVE',
      measureUnitId: unit?.id,
      categoryId: category?.id,
      brandId: brand?.id,
      locationId: almox?.id,
    },
    create: {
      code: 'ITM-VAL-001',
      description: 'Ácido Ascórbico',
      sku: 'ASC-500',
      trackLot: true,
      trackExpiry: true,
      trackStock: true,
      currentStock: 0,
      costPrice: 12.5,
      salePrice: 28.9,
      status: 'ACTIVE',
      measureUnitId: unit?.id,
      categoryId: category?.id,
      brandId: brand?.id,
      locationId: almox?.id,
    },
  });

  const itemB = await prisma.stockItem.upsert({
    where: { code: 'ITM-VAL-002' },
    update: {
      description: 'Essência de Menta',
      trackLot: true,
      trackExpiry: true,
      trackStock: true,
      costPrice: 45,
      salePrice: 89,
      status: 'ACTIVE',
      measureUnitId: unit?.id,
      categoryId: category?.id,
      brandId: brand?.id,
    },
    create: {
      code: 'ITM-VAL-002',
      description: 'Essência de Menta',
      sku: 'MEN-100',
      trackLot: true,
      trackExpiry: true,
      trackStock: true,
      currentStock: 0,
      costPrice: 45,
      salePrice: 89,
      status: 'ACTIVE',
      measureUnitId: unit?.id,
      categoryId: category?.id,
      brandId: brand?.id,
      locationId: farmacia?.id,
    },
  });

  const lots = [
    {
      itemId: itemA.id,
      lotNumber: 'Lote-A-001',
      manufacturingDate: addDays(todayUtc, -180),
      expiryDate: addDays(todayUtc, -5),
      quantity: 40,
      locationId: almox?.id,
    },
    {
      itemId: itemA.id,
      lotNumber: 'Lote-A-002',
      manufacturingDate: addDays(todayUtc, -60),
      expiryDate: addDays(todayUtc, 0),
      quantity: 25,
      locationId: almox?.id,
    },
    {
      itemId: itemA.id,
      lotNumber: 'Lote-A-003',
      manufacturingDate: addDays(todayUtc, -30),
      expiryDate: addDays(todayUtc, 5),
      quantity: 50,
      locationId: farmacia?.id,
    },
    {
      itemId: itemB.id,
      lotNumber: 'Lote-B-001',
      manufacturingDate: addDays(todayUtc, -90),
      expiryDate: addDays(todayUtc, 20),
      quantity: 12,
      locationId: farmacia?.id,
    },
    {
      itemId: itemB.id,
      lotNumber: 'Lote-B-002',
      manufacturingDate: addDays(todayUtc, -20),
      expiryDate: addDays(todayUtc, 85),
      quantity: 80,
      locationId: almox?.id,
    },
  ];

  for (const lot of lots) {
    await prisma.stockLot.upsert({
      where: {
        itemId_lotNumber: { itemId: lot.itemId, lotNumber: lot.lotNumber },
      },
      update: {
        manufacturingDate: lot.manufacturingDate,
        expiryDate: lot.expiryDate,
        quantity: lot.quantity,
        locationId: lot.locationId ?? null,
      },
      create: lot,
    });
  }

  const totalQty = lots
    .filter((l) => l.itemId === itemA.id)
    .reduce((sum, l) => sum + l.quantity, 0);
  const totalQtyB = lots
    .filter((l) => l.itemId === itemB.id)
    .reduce((sum, l) => sum + l.quantity, 0);

  await prisma.stockItem.update({
    where: { id: itemA.id },
    data: { currentStock: totalQty },
  });
  await prisma.stockItem.update({
    where: { id: itemB.id },
    data: { currentStock: totalQtyB },
  });

  const customers = [
    {
      code: 'CLI-001',
      name: 'Cliente Balcão',
      documentType: 'CPF',
      document: '00000000000',
      phone: null,
    },
    {
      code: 'CLI-002',
      name: 'Maria Silva',
      documentType: 'CPF',
      document: '12345678901',
      phone: '11999990001',
    },
    {
      code: 'CLI-003',
      name: 'Farmácia Parceira LTDA',
      documentType: 'CNPJ',
      document: '12345678000199',
      phone: '1133334444',
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { code: customer.code },
      update: {
        name: customer.name,
        documentType: customer.documentType,
        document: customer.document,
        phone: customer.phone,
        active: true,
      },
      create: customer,
    });
  }

  console.log(
    `Seed OK: usuário ${email}, lookups, lotes e clientes de venda disponíveis.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed falhou');
    console.error(error instanceof Error ? error.message : 'erro desconhecido');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
