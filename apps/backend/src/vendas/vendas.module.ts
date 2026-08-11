import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CartService } from './application/services/cart.service';
import { CarrinhoController } from './presentation/carrinho.controller';

@Module({
  imports: [AuthModule],
  controllers: [CarrinhoController],
  providers: [CartService],
  exports: [CartService],
})
export class VendasModule {}
