import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashFlowLedgerService } from './application/services/cash-flow-ledger.service';
import { ContasPagarService } from './application/services/contas-pagar.service';
import { ContasReceberService } from './application/services/contas-receber.service';
import { FluxoCaixaService } from './application/services/fluxo-caixa.service';
import { ContasPagarController } from './presentation/contas-pagar.controller';
import { ContasReceberController } from './presentation/contas-receber.controller';
import { FluxoCaixaController } from './presentation/fluxo-caixa.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    ContasReceberController,
    ContasPagarController,
    FluxoCaixaController,
  ],
  providers: [
    ContasReceberService,
    ContasPagarService,
    CashFlowLedgerService,
    FluxoCaixaService,
  ],
  exports: [ContasReceberService, ContasPagarService, FluxoCaixaService],
})
export class FinanceiroModule {}
