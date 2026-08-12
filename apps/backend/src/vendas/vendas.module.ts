import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BuscaIaService } from './application/services/busca-ia.service';
import { CaixaService } from './application/services/caixa.service';
import { CartService } from './application/services/cart.service';
import { PaymentService } from './application/services/payment.service';
import { PromocaoService } from './application/services/promocao.service';
import { OpenAiLlmIntentParser } from './infrastructure/openai-llm-intent.parser';
import { BuscaIaController } from './presentation/busca-ia.controller';
import { CaixaController } from './presentation/caixa.controller';
import { CarrinhoController } from './presentation/carrinho.controller';
import { PagamentosController } from './presentation/pagamentos.controller';
import { PromocoesController } from './presentation/promocoes.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    CarrinhoController,
    PagamentosController,
    CaixaController,
    BuscaIaController,
    PromocoesController,
  ],
  providers: [
    CaixaService,
    CartService,
    PaymentService,
    BuscaIaService,
    PromocaoService,
    OpenAiLlmIntentParser,
  ],
  exports: [
    CaixaService,
    CartService,
    PaymentService,
    BuscaIaService,
    PromocaoService,
  ],
})
export class VendasModule {}
