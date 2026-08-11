import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CartService } from '../application/services/cart.service';
import {
  CartItemNotFoundError,
  CartNotFoundError,
  CartValidationError,
  CustomerNotFoundError,
  ProductNotFoundError,
} from '../domain/cart/errors';
import {
  AddCartItemDto,
  SearchQueryDto,
  SetCartDiscountDto,
  SetCustomerDto,
  UpdateCartItemDto,
} from './dto/carrinho.dto';

@Controller('vendas')
@UseGuards(JwtAuthGuard)
export class CarrinhoController {
  constructor(private readonly cart: CartService) {}

  @Get('carrinho')
  getCart(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.cart.getOrCreateOpenCart(user.id);
  }

  @Post('carrinho/itens')
  async addItem(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: AddCartItemDto,
  ) {
    try {
      return await this.cart.addItem(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch('carrinho/itens/:lineId')
  async updateItem(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('lineId') lineId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    try {
      return await this.cart.updateItem(user.id, lineId, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Delete('carrinho/itens/:lineId')
  async removeItem(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('lineId') lineId: string,
  ) {
    try {
      return await this.cart.removeItem(user.id, lineId);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Put('carrinho/cliente')
  async setCustomer(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: SetCustomerDto,
  ) {
    try {
      return await this.cart.setCustomer(user.id, body.customerId);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch('carrinho/desconto')
  async setDiscount(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: SetCartDiscountDto,
  ) {
    try {
      return await this.cart.setCartDiscount(user.id, body.cartDiscount);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('carrinho/limpar')
  @HttpCode(200)
  async clear(@CurrentUser() user: AuthenticatedRequestUser) {
    try {
      return await this.cart.clear(user.id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('carrinho/validar-pagamento')
  @HttpCode(200)
  async validatePayment(@CurrentUser() user: AuthenticatedRequestUser) {
    try {
      return await this.cart.validateForPayment(user.id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('clientes')
  searchCustomers(@Query() query: SearchQueryDto) {
    return this.cart.searchCustomers(
      query.search,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  @Get('produtos')
  searchProducts(@Query() query: SearchQueryDto) {
    return this.cart.searchProducts(
      query.search,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  private rethrow(error: unknown): never {
    if (error instanceof CartValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (
      error instanceof CartNotFoundError ||
      error instanceof CartItemNotFoundError ||
      error instanceof ProductNotFoundError ||
      error instanceof CustomerNotFoundError
    ) {
      throw new NotFoundException({
        code: error.name,
        message: error.message,
      });
    }
    throw error;
  }
}
