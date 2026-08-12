import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CaixaBancosService } from '../application/services/caixa-bancos.service';
import {
  CashFlowNotFoundError,
  CashFlowPermissionError,
  CashFlowValidationError,
} from '../domain/cash-flow/errors';
import {
  AdjustBalanceDto,
  BankAccountDetailQueryDto,
  BankAccountMovementDto,
  BankAccountReasonDto,
  BankAccountTransferDto,
  CaixaBancosPeriodQueryDto,
  CreateBankAccountDto,
  ExtratoQueryDto,
  ListBankAccountsQueryDto,
  UpdateBankAccountDto,
} from './dto/caixa-bancos.dto';

function truthyFlag(value?: string): boolean {
  return value === '1' || value === 'true';
}

@Controller('financeiro/caixa-bancos')
@UseGuards(JwtAuthGuard)
export class CaixaBancosController {
  constructor(private readonly service: CaixaBancosService) {}

  @Get('lookups')
  lookups() {
    return this.service.getLookups();
  }

  @Get('dashboard')
  async dashboard(@Query() query: CaixaBancosPeriodQueryDto) {
    try {
      return await this.service.dashboard(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListBankAccountsQueryDto,
  ) {
    try {
      return await this.service.listAccounts({
        ...query,
        revealSensitive: truthyFlag(query.revealSensitive),
        actorId: user.id,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('transferencias')
  async transfer(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: BankAccountTransferDto,
  ) {
    try {
      return await this.service.createTransfer(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('movimentos/:movementId/estornar')
  @HttpCode(200)
  async reverse(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('movementId') movementId: string,
    @Body() body: BankAccountReasonDto,
  ) {
    try {
      return await this.service.reverseMovement(
        user.id,
        movementId,
        body.reason,
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Query() query: BankAccountDetailQueryDto,
  ) {
    try {
      return await this.service.getById(id, {
        ...query,
        revealSensitive: truthyFlag(query.reveal),
        actorId: user.id,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateBankAccountDto,
  ) {
    try {
      return await this.service.createAccount(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: UpdateBankAccountDto,
  ) {
    try {
      return await this.service.updateAccount(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/ativar')
  @HttpCode(200)
  async activate(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.service.setActive(user.id, id, true);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/inativar')
  @HttpCode(200)
  async deactivate(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.service.setActive(user.id, id, false);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id/extrato')
  async extrato(@Param('id') id: string, @Query() query: ExtratoQueryDto) {
    try {
      return await this.service.extrato(id, query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id/historico')
  async historico(@Param('id') id: string) {
    try {
      return await this.service.historico(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/entradas')
  async entrada(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: BankAccountMovementDto,
  ) {
    try {
      return await this.service.createEntrada(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/saidas')
  async saida(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: BankAccountMovementDto,
  ) {
    try {
      return await this.service.createSaida(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/ajustar-saldo')
  @HttpCode(200)
  async adjust(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: AdjustBalanceDto,
  ) {
    try {
      return await this.service.adjustBalance(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof CashFlowNotFoundError) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }
    if (error instanceof CashFlowPermissionError) {
      throw new ForbiddenException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof CashFlowValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}
