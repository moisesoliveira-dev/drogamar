import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@drogamar.local')
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow!123';
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, status: 'ACTIVE' },
    create: { email, passwordHash, name, status: 'ACTIVE' },
  });

  for (const [code, label] of [
    ['UN', 'Unidade'],
    ['KG', 'Quilograma'],
    ['G', 'Grama'],
    ['L', 'Litro'],
    ['ML', 'Mililitro'],
    ['CX', 'Caixa'],
    ['PC', 'Peça'],
  ] as const) {
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

  const customers = [
    {
      code: 'CLI-001',
      name: 'Cliente Balcão',
      documentType: 'CPF' as const,
      document: '00000000000',
      phone: null as string | null,
    },
    {
      code: 'CLI-002',
      name: 'Maria Silva',
      documentType: 'CPF' as const,
      document: '12345678901',
      phone: '11999990001',
    },
    {
      code: 'CLI-003',
      name: 'Farmácia Parceira LTDA',
      documentType: 'CNPJ' as const,
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
    `Seed OK: usuário ${email}, lookups de estoque e clientes de venda disponíveis.`,
  );
}

main()
  .catch((error) => {
    console.error('Seed falhou', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
