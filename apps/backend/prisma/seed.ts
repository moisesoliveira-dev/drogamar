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

  console.log(`Seed OK: usuário ${email} e lookups de estoque disponíveis.`);
}

main()
  .catch((error) => {
    console.error('Seed falhou', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
