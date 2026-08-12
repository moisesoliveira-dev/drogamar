import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { FluxoCaixaService } from '../application/services/fluxo-caixa.service';
import {
  CashFlowNotFoundError,
  CashFlowPermissionError,
  CashFlowValidationError,
} from '../domain/cash-flow/errors';
import {
  CashFlowAnalysisQueryDto,
  CashFlowPeriodQueryDto,
  CashFlowProjectionQueryDto,
  CashFlowReasonDto,
  CashFlowSeriesQueryDto,
  CreateCashFlowMovementDto,
  CreateTransferDto,
  ListCashFlowMovementsQueryDto,
} from './dto/fluxo-caixa.dto';

@Controller('financeiro/fluxo-caixa')
@UseGuards(JwtAuthGuard)
export class FluxoCaixaController {
  constructor(private readonly service: FluxoCaixaService) {}

  @Get('lookups')
  lookups() {
    return this.service.getLookups();
  }

  @Get('dashboard')
  async dashboard(@Query() query: CashFlowPeriodQueryDto) {
    try {
      return await this.service.dashboard(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('series')
  async series(@Query() query: CashFlowSeriesQueryDto) {
    try {
      return await this.service.series(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('projection')
  async projection(@Query() query: CashFlowProjectionQueryDto) {
    try {
      return await this.service.projection(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('movements')
  async movements(@Query() query: ListCashFlowMovementsQueryDto) {
    try {
      return await this.service.listMovements(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('movements/:id')
  async movementDetail(@Param('id') id: string) {
    try {
      return await this.service.getById(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('analysis/categories')
  async analysisCategories(@Query() query: CashFlowAnalysisQueryDto) {
    try {
      return await this.service.analysisByCategory(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('balances/accounts')
  async balancesAccounts(@Query() query: CashFlowPeriodQueryDto) {
    try {
      return await this.service.balancesByAccount(query);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('movements')
  async createMovement(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateCashFlowMovementDto,
  ) {
    try {
      return await this.service.createManual(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('transferencias')
  async createTransfer(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateTransferDto,
  ) {
    try {
      return await this.service.createTransfer(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('movements/:id/cancelar')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: CashFlowReasonDto,
  ) {
    try {
      return await this.service.cancelMovement(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('movements/:id/estornar')
  @HttpCode(200)
  async reverse(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: CashFlowReasonDto,
  ) {
    try {
      return await this.service.reverseMovement(user.id, id, body.reason);
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
