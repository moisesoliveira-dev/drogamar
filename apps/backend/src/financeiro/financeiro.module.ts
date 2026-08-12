import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashFlowLedgerService } from './application/services/cash-flow-ledger.service';
import { ContasPagarService } from './application/services/contas-pagar.service';
import { ContasReceberService } from './application/services/contas-receber.service';
import { ContasPagarController } from './presentation/contas-pagar.controller';
import { ContasReceberController } from './presentation/contas-receber.controller';

@Module({
  imports: [AuthModule],
  controllers: [ContasReceberController, ContasPagarController],
  providers: [
    ContasReceberService,
    ContasPagarService,
    CashFlowLedgerService,
  ],
  exports: [ContasReceberService, ContasPagarService, CashFlowLedgerService],
})
export class FinanceiroModule {}
