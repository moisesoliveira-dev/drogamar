import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CaixaService } from '../application/services/caixa.service';
import {
  CashSessionConflictError,
  CashSessionRequiredError,
  PaymentValidationError,
} from '../domain/cart/errors';
import { CloseCashSessionDto, OpenCashSessionDto } from './dto/caixa.dto';

@Controller('vendas/caixa')
@UseGuards(JwtAuthGuard)
export class CaixaController {
  constructor(private readonly caixa: CaixaService) {}

  @Get()
  getCurrent(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.caixa.getCurrent(user.id);
  }

  @Post('abrir')
  @HttpCode(200)
  async open(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: OpenCashSessionDto,
  ) {
    try {
      return await this.caixa.open(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('fechamento')
  async previewClose(@CurrentUser() user: AuthenticatedRequestUser) {
    try {
      return await this.caixa.previewClose(user.id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('fechar')
  @HttpCode(200)
  async close(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CloseCashSessionDto,
  ) {
    try {
      return await this.caixa.close(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (
      error instanceof PaymentValidationError ||
      error instanceof CashSessionRequiredError ||
      error instanceof CashSessionConflictError
    ) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}
