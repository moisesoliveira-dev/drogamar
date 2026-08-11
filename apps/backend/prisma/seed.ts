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

  // Não logar a senha
  console.log(`Seed OK: usuário ${email} disponível.`);
}

main()
  .catch((error) => {
    console.error('Seed falhou', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
