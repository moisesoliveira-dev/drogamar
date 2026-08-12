import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CaixaService } from './application/services/caixa.service';
import { CartService } from './application/services/cart.service';
import { PaymentService } from './application/services/payment.service';
import { CaixaController } from './presentation/caixa.controller';
import { CarrinhoController } from './presentation/carrinho.controller';
import { PagamentosController } from './presentation/pagamentos.controller';

@Module({
  imports: [AuthModule],
  controllers: [CarrinhoController, PagamentosController, CaixaController],
  providers: [CaixaService, CartService, PaymentService],
  exports: [CaixaService, CartService, PaymentService],
})
export class VendasModule {}
