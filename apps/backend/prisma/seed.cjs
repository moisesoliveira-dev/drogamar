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

  await prisma.cashRegister.upsert({
    where: { code: 'CX-01' },
    update: { name: 'Caixa 01', active: true },
    create: { code: 'CX-01', name: 'Caixa 01', active: true },
  });

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

  for (const method of [
    ['DINHEIRO', 'Dinheiro'],
    ['PIX', 'PIX'],
    ['TED', 'TED/Transferência'],
    ['BOLETO', 'Boleto'],
    ['CARTAO', 'Cartão'],
  ]) {
    await prisma.financePaymentMethod.upsert({
      where: { code: method[0] },
      update: { label: method[1], active: true },
      create: { code: method[0], label: method[1], active: true },
    });
  }

  await prisma.bankAccount.upsert({
    where: { code: 'CX-GERAL' },
    update: {
      name: 'Caixa Geral',
      bankName: null,
      kind: 'CASH',
      active: true,
    },
    create: {
      code: 'CX-GERAL',
      name: 'Caixa Geral',
      bankName: null,
      kind: 'CASH',
      active: true,
    },
  });

  await prisma.bankAccount.upsert({
    where: { code: 'BB-001' },
    update: {
      name: 'Conta Corrente BB',
      bankName: 'Banco do Brasil',
      kind: 'CHECKING',
      agency: '1234-5',
      accountNumber: '98765',
      accountDigit: '4',
      notes: 'Conta operacional principal',
      active: true,
    },
    create: {
      code: 'BB-001',
      name: 'Conta Corrente BB',
      bankName: 'Banco do Brasil',
      kind: 'CHECKING',
      agency: '1234-5',
      accountNumber: '98765',
      accountDigit: '4',
      notes: 'Conta operacional principal',
      active: true,
    },
  });

  for (const center of [
    ['ADM', 'Administrativo'],
    ['VEN', 'Vendas'],
  ]) {
    await prisma.costCenter.upsert({
      where: { code: center[0] },
      update: { name: center[1], active: true },
      create: { code: center[0], name: center[1], active: true },
    });
  }

  const admin = await prisma.user.findUnique({ where: { email } });
  const maria = await prisma.customer.findUnique({ where: { code: 'CLI-002' } });
  const pix = await prisma.financePaymentMethod.findUnique({
    where: { code: 'PIX' },
  });
  if (admin && maria) {
    const existing = await prisma.accountReceivable.findFirst({
      where: { document: 'NF-SEED-001' },
    });
    if (!existing) {
      const today = new Date();
      const overdue = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 5),
      );
      const future = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 10),
      );
      const issue = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 20),
      );

      const overdueReceivable = await prisma.accountReceivable.create({
        data: {
          customerId: maria.id,
          origin: 'MANUAL',
          description: 'Serviço de manipulação — seed',
          document: 'NF-SEED-001',
          issueDate: issue,
          dueDate: overdue,
          originalAmount: 500,
          paymentMethodId: pix?.id,
          createdById: admin.id,
          installmentCount: 1,
          status: 'OPEN',
        },
      });
      await prisma.receivableInstallment.create({
        data: {
          receivableId: overdueReceivable.id,
          number: 1,
          dueDate: overdue,
          amount: 500,
          status: 'OPEN',
        },
      });

      const openReceivable = await prisma.accountReceivable.create({
        data: {
          customerId: maria.id,
          origin: 'MANUAL',
          description: 'Pedido a prazo — seed',
          document: 'NF-SEED-002',
          issueDate: issue,
          dueDate: future,
          originalAmount: 320,
          paymentMethodId: pix?.id,
          createdById: admin.id,
          installmentCount: 2,
          status: 'OPEN',
        },
      });
      await prisma.receivableInstallment.createMany({
        data: [
          {
            receivableId: openReceivable.id,
            number: 1,
            dueDate: future,
            amount: 160,
            status: 'OPEN',
          },
          {
            receivableId: openReceivable.id,
            number: 2,
            dueDate: new Date(
              Date.UTC(
                future.getUTCFullYear(),
                future.getUTCMonth() + 1,
                future.getUTCDate(),
              ),
            ),
            amount: 160,
            status: 'OPEN',
          },
        ],
      });
    }
  }

  for (const supplier of [
    {
      code: 'FOR-001',
      name: 'Distribuidora Farma Sul',
      documentType: 'CNPJ',
      document: '11222333000181',
      phone: '11990001111',
    },
    {
      code: 'FOR-002',
      name: 'Insumos Química Brasil',
      documentType: 'CNPJ',
      document: '22333444000192',
      phone: '11990002222',
    },
    {
      code: 'FOR-003',
      name: 'Serviços Contábeis Alfa',
      documentType: 'CNPJ',
      document: '33444555000103',
      phone: '11990003333',
    },
  ]) {
    await prisma.supplier.upsert({
      where: { code: supplier.code },
      update: {
        name: supplier.name,
        documentType: supplier.documentType,
        document: supplier.document,
        phone: supplier.phone,
        active: true,
      },
      create: supplier,
    });
  }

  for (const category of [
    ['ALUGUEL', 'Aluguel'],
    ['ENERGIA', 'Energia'],
    ['INTERNET', 'Internet'],
    ['MATERIAIS', 'Materiais'],
    ['SERVICOS', 'Serviços'],
    ['IMPOSTOS', 'Impostos'],
    ['OUTROS', 'Outros'],
  ]) {
    await prisma.expenseCategory.upsert({
      where: { code: category[0] },
      update: { name: category[1], active: true },
      create: { code: category[0], name: category[1], active: true },
    });
  }

  const farmaSul = await prisma.supplier.findUnique({ where: { code: 'FOR-001' } });
  const quimica = await prisma.supplier.findUnique({ where: { code: 'FOR-002' } });
  const aluguel = await prisma.expenseCategory.findUnique({
    where: { code: 'ALUGUEL' },
  });
  const materiais = await prisma.expenseCategory.findUnique({
    where: { code: 'MATERIAIS' },
  });
  const energia = await prisma.expenseCategory.findUnique({
    where: { code: 'ENERGIA' },
  });
  const boleto = await prisma.financePaymentMethod.findUnique({
    where: { code: 'BOLETO' },
  });

  if (admin && farmaSul && quimica) {
    const existingPayable = await prisma.accountPayable.findFirst({
      where: { document: 'NF-AP-SEED-001' },
    });
    if (!existingPayable) {
      const todayAp = new Date();
      const overdueAp = new Date(
        Date.UTC(
          todayAp.getUTCFullYear(),
          todayAp.getUTCMonth(),
          todayAp.getUTCDate() - 7,
        ),
      );
      const futureAp = new Date(
        Date.UTC(
          todayAp.getUTCFullYear(),
          todayAp.getUTCMonth(),
          todayAp.getUTCDate() + 12,
        ),
      );
      const issueAp = new Date(
        Date.UTC(
          todayAp.getUTCFullYear(),
          todayAp.getUTCMonth(),
          todayAp.getUTCDate() - 25,
        ),
      );

      const overduePayable = await prisma.accountPayable.create({
        data: {
          supplierId: farmaSul.id,
          origin: 'PURCHASE',
          description: 'Compra de insumos — seed',
          document: 'NF-AP-SEED-001',
          categoryId: materiais?.id,
          issueDate: issueAp,
          dueDate: overdueAp,
          originalAmount: 850,
          paymentMethodId: boleto?.id ?? pix?.id,
          createdById: admin.id,
          installmentCount: 1,
          status: 'OPEN',
        },
      });
      await prisma.payableInstallment.create({
        data: {
          payableId: overduePayable.id,
          number: 1,
          dueDate: overdueAp,
          amount: 850,
          status: 'OPEN',
        },
      });

      const openPayable = await prisma.accountPayable.create({
        data: {
          supplierId: quimica.id,
          origin: 'MANUAL',
          description: 'Aluguel mensal — seed',
          document: 'NF-AP-SEED-002',
          categoryId: aluguel?.id,
          issueDate: issueAp,
          dueDate: futureAp,
          originalAmount: 4200,
          paymentMethodId: boleto?.id ?? pix?.id,
          createdById: admin.id,
          installmentCount: 1,
          status: 'OPEN',
        },
      });
      await prisma.payableInstallment.create({
        data: {
          payableId: openPayable.id,
          number: 1,
          dueDate: futureAp,
          amount: 4200,
          status: 'OPEN',
        },
      });

      const partialPayable = await prisma.accountPayable.create({
        data: {
          supplierId: farmaSul.id,
          origin: 'CONTRACT',
          description: 'Energia elétrica — seed parcial',
          document: 'NF-AP-SEED-003',
          categoryId: energia?.id,
          issueDate: issueAp,
          dueDate: futureAp,
          originalAmount: 600,
          paidAmount: 200,
          paymentMethodId: pix?.id,
          createdById: admin.id,
          installmentCount: 2,
          status: 'PARTIAL',
        },
      });
      await prisma.payableInstallment.createMany({
        data: [
          {
            payableId: partialPayable.id,
            number: 1,
            dueDate: futureAp,
            amount: 300,
            paidAmount: 200,
            status: 'PARTIAL',
          },
          {
            payableId: partialPayable.id,
            number: 2,
            dueDate: new Date(
              Date.UTC(
                futureAp.getUTCFullYear(),
                futureAp.getUTCMonth() + 1,
                futureAp.getUTCDate(),
              ),
            ),
            amount: 300,
            status: 'OPEN',
          },
        ],
      });
    }
  }

  const cxGeral = await prisma.bankAccount.findUnique({
    where: { code: 'CX-GERAL' },
  });
  const bb001 = await prisma.bankAccount.findUnique({ where: { code: 'BB-001' } });
  const adminUser = await prisma.user.findUnique({ where: { email } });

  if (adminUser && cxGeral) {
    const hasOpening = await prisma.cashFlowMovement.findFirst({
      where: {
        bankAccountId: cxGeral.id,
        kind: 'ADJUSTMENT',
        direction: 'IN',
      },
    });
    if (!hasOpening) {
      const openingDate = new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      );
      await prisma.cashFlowMovement.create({
        data: {
          direction: 'IN',
          kind: 'ADJUSTMENT',
          status: 'REALIZED',
          amount: 15000,
          occurredAt: openingDate,
          description: 'Saldo inicial — Caixa Geral',
          bankAccountId: cxGeral.id,
          origin: 'OTHER',
          operatorId: adminUser.id,
        },
      });
      if (bb001) {
        await prisma.cashFlowMovement.create({
          data: {
            direction: 'IN',
            kind: 'ADJUSTMENT',
            status: 'REALIZED',
            amount: 25000,
            occurredAt: openingDate,
            description: 'Saldo inicial — Conta Corrente BB',
            bankAccountId: bb001.id,
            origin: 'OTHER',
            operatorId: adminUser.id,
          },
        });
      }
    }

    const receiptsWithoutCf = await prisma.receivableMovement.findMany({
      where: {
        type: 'RECEIPT',
        cashFlowMovement: null,
      },
      include: {
        receivable: { select: { description: true, document: true, costCenterId: true, bankAccountId: true } },
      },
    });
    for (const receipt of receiptsWithoutCf) {
      await prisma.cashFlowMovement.create({
        data: {
          direction: 'IN',
          kind: 'RECEIPT',
          status: 'REALIZED',
          amount: receipt.amount,
          occurredAt: receipt.paidAt,
          description: receipt.receivable.description,
          bankAccountId:
            receipt.bankAccountId ||
            receipt.receivable.bankAccountId ||
            cxGeral.id,
          costCenterId: receipt.receivable.costCenterId,
          origin: 'RECEIVABLE',
          originRef: receipt.receivable.document,
          receivableMovementId: receipt.id,
          notes: receipt.notes,
          operatorId: receipt.operatorId,
        },
      });
    }

    const paymentsWithoutCf = await prisma.payableMovement.findMany({
      where: {
        type: 'PAYMENT',
        cashFlowMovement: null,
      },
      include: {
        payable: {
          select: {
            description: true,
            document: true,
            categoryId: true,
            costCenterId: true,
            bankAccountId: true,
          },
        },
      },
    });
    for (const payment of paymentsWithoutCf) {
      await prisma.cashFlowMovement.create({
        data: {
          direction: 'OUT',
          kind: 'PAYMENT',
          status: 'REALIZED',
          amount: payment.amount,
          occurredAt: payment.paidAt,
          description: payment.payable.description,
          bankAccountId:
            payment.bankAccountId ||
            payment.payable.bankAccountId ||
            cxGeral.id,
          categoryId: payment.payable.categoryId,
          costCenterId: payment.payable.costCenterId,
          origin: 'PAYABLE',
          originRef: payment.payable.document,
          payableMovementId: payment.id,
          notes: payment.notes,
          operatorId: payment.operatorId,
        },
      });
    }

    const hasManualSample = await prisma.cashFlowMovement.findFirst({
      where: {
        kind: 'MANUAL',
        description: 'Aporte de capital — seed',
      },
    });
    if (!hasManualSample) {
      await prisma.cashFlowMovement.create({
        data: {
          direction: 'IN',
          kind: 'MANUAL',
          status: 'REALIZED',
          amount: 500,
          occurredAt: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate(),
            ),
          ),
          description: 'Aporte de capital — seed',
          bankAccountId: cxGeral.id,
          origin: 'MANUAL',
          operatorId: adminUser.id,
          notes: 'Movimentação manual de exemplo',
        },
      });
    }
  }

  console.log(
    `Seed OK: usuário ${email}, lookups, lotes, clientes, fornecedores, contas a pagar/receber e fluxo de caixa disponíveis.`,
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
