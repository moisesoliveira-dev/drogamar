import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContasReceberService } from './application/services/contas-receber.service';
import { ContasReceberController } from './presentation/contas-receber.controller';

@Module({
  imports: [AuthModule],
  controllers: [ContasReceberController],
  providers: [ContasReceberService],
  exports: [ContasReceberService],
})
export class FinanceiroModule {}
