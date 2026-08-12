import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PaymentService } from '../application/services/payment.service';
import {
  CartNotFoundError,
  CartValidationError,
  CashSessionConflictError,
  CashSessionRequiredError,
  PaymentValidationError,
  ReceiptNotFoundError,
} from '../domain/cart/errors';
import { FinalizePaymentDto } from './dto/pagamento.dto';

@Controller('vendas/pagamentos')
@UseGuards(JwtAuthGuard)
export class PagamentosController {
  constructor(private readonly payments: PaymentService) {}

  @Get('metodos')
  listMethods() {
    return this.payments.listMethods();
  }

  @Get('sessao')
  async getSession(@CurrentUser() user: AuthenticatedRequestUser) {
    try {
      return await this.payments.getSession(user.id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('finalizar')
  @HttpCode(200)
  async finalize(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: FinalizePaymentDto,
  ) {
    try {
      return await this.payments.finalize(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('cancelar')
  @HttpCode(200)
  async cancel(@CurrentUser() user: AuthenticatedRequestUser) {
    try {
      return await this.payments.cancelCheckout(user.id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('comprovantes/:receiptId')
  async getReceipt(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('receiptId') receiptId: string,
  ) {
    try {
      return await this.payments.getReceipt(user.id, receiptId);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (
      error instanceof PaymentValidationError ||
      error instanceof CartValidationError ||
      error instanceof CashSessionRequiredError ||
      error instanceof CashSessionConflictError
    ) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (
      error instanceof CartNotFoundError ||
      error instanceof ReceiptNotFoundError
    ) {
      throw new NotFoundException({
        code: error.name,
        message: error.message,
      });
    }
    throw error;
  }
}
