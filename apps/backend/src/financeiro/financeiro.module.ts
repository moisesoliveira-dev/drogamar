import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CaixaBancosService } from './application/services/caixa-bancos.service';
import { CashFlowLedgerService } from './application/services/cash-flow-ledger.service';
import { CollectionSyncService } from './application/services/collection-sync.service';
import { ContasPagarService } from './application/services/contas-pagar.service';
import { ContasReceberService } from './application/services/contas-receber.service';
import { FluxoCaixaService } from './application/services/fluxo-caixa.service';
import { CaixaBancosController } from './presentation/caixa-bancos.controller';
import { ContasPagarController } from './presentation/contas-pagar.controller';
import { ContasReceberController } from './presentation/contas-receber.controller';
import { FluxoCaixaController } from './presentation/fluxo-caixa.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    ContasReceberController,
    ContasPagarController,
    FluxoCaixaController,
    CaixaBancosController,
  ],
  providers: [
    ContasReceberService,
    ContasPagarService,
    CashFlowLedgerService,
    FluxoCaixaService,
    CaixaBancosService,
    CollectionSyncService,
  ],
  exports: [
    ContasReceberService,
    ContasPagarService,
    FluxoCaixaService,
    CaixaBancosService,
    CollectionSyncService,
  ],
})
export class FinanceiroModule {}
