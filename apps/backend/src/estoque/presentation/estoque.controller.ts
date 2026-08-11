import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  ConflictException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import {
  ActivateStockItemCommand,
  CreateStockItemCommand,
  DeactivateStockItemCommand,
  DeleteStockItemCommand,
  DuplicateStockItemCommand,
  UpdateStockItemCommand,
} from '../application/commands/stock-item.commands';
import { CreateStockItemHandler } from '../application/handlers/create-stock-item.handler';
import { DuplicateStockItemHandler } from '../application/handlers/duplicate-stock-item.handler';
import {
  ActivateStockItemHandler,
  DeactivateStockItemHandler,
  DeleteStockItemHandler,
} from '../application/handlers/lifecycle-stock-item.handler';
import {
  GetStockItemHandler,
  GetStockLookupsHandler,
  ListStockItemsHandler,
} from '../application/handlers/query-stock-item.handler';
import {
  GetStockLotHandler,
  ListExpiryAlertsHandler,
} from '../application/handlers/expiry-alert.handler';
import { UpdateStockItemHandler } from '../application/handlers/update-stock-item.handler';
import {
  GetStockItemQuery,
  GetStockLookupsQuery,
  ListStockItemsQuery,
} from '../application/queries/stock-item.queries';
import {
  GetStockLotQuery,
  ListExpiryAlertsQuery,
} from '../application/queries/expiry-alert.queries';
import {
  StockItemDuplicateBarcodeError,
  StockItemDuplicateCodeError,
  StockItemDuplicateSkuError,
  StockItemNotFoundError,
  StockItemValidationError,
} from '../domain/errors';
import { ListExpiryAlertsQueryDto } from './dto/expiry-alert.dto';
import {
  ListStockItemsQueryDto,
  UpsertStockItemBodyDto,
} from './dto/stock-item.dto';

@Controller('estoque')
@UseGuards(JwtAuthGuard)
export class EstoqueController {
  constructor(
    private readonly listHandler: ListStockItemsHandler,
    private readonly getHandler: GetStockItemHandler,
    private readonly lookupsHandler: GetStockLookupsHandler,
    private readonly createHandler: CreateStockItemHandler,
    private readonly updateHandler: UpdateStockItemHandler,
    private readonly duplicateHandler: DuplicateStockItemHandler,
    private readonly deactivateHandler: DeactivateStockItemHandler,
    private readonly activateHandler: ActivateStockItemHandler,
    private readonly deleteHandler: DeleteStockItemHandler,
    private readonly listExpiryHandler: ListExpiryAlertsHandler,
    private readonly getLotHandler: GetStockLotHandler,
  ) {}

  @Get('lookups')
  async lookups() {
    return this.lookupsHandler.execute(new GetStockLookupsQuery());
  }

  @Get('validade/alertas')
  async listExpiryAlerts(@Query() query: ListExpiryAlertsQueryDto) {
    return this.listExpiryHandler.execute(
      new ListExpiryAlertsQuery({
        ...query,
        expiryFrom: query.expiryFrom ? new Date(query.expiryFrom) : undefined,
        expiryTo: query.expiryTo ? new Date(query.expiryTo) : undefined,
      }),
    );
  }

  @Get('validade/lotes/:id')
  async getLot(
    @Param('id') id: string,
    @Query('alertWindowDays') alertWindowDays?: string,
  ) {
    const window = alertWindowDays ? Number(alertWindowDays) : 30;
    return this.getLotHandler.execute(
      new GetStockLotQuery(id, Number.isFinite(window) ? window : 30),
    );
  }

  @Get('itens')
  async list(@Query() query: ListStockItemsQueryDto) {
    return this.listHandler.execute(new ListStockItemsQuery(query));
  }

  @Get('itens/:id')
  async get(@Param('id') id: string) {
    try {
      return await this.getHandler.execute(new GetStockItemQuery(id));
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('itens')
  async create(@Body() body: UpsertStockItemBodyDto) {
    try {
      return await this.createHandler.execute(new CreateStockItemCommand(body));
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch('itens/:id')
  async update(@Param('id') id: string, @Body() body: UpsertStockItemBodyDto) {
    try {
      return await this.updateHandler.execute(
        new UpdateStockItemCommand(id, body),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('itens/:id/duplicate')
  async duplicate(@Param('id') id: string) {
    try {
      return await this.duplicateHandler.execute(
        new DuplicateStockItemCommand(id),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('itens/:id/deactivate')
  async deactivate(@Param('id') id: string) {
    try {
      return await this.deactivateHandler.execute(
        new DeactivateStockItemCommand(id),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('itens/:id/activate')
  async activate(@Param('id') id: string) {
    try {
      return await this.activateHandler.execute(
        new ActivateStockItemCommand(id),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Delete('itens/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    try {
      await this.deleteHandler.execute(new DeleteStockItemCommand(id));
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof StockItemNotFoundError) {
      throw new NotFoundException({
        code: 'ITEM_NOT_FOUND',
        message: 'Item não encontrado.',
      });
    }
    if (error instanceof StockItemDuplicateCodeError) {
      throw new ConflictException({
        code: 'DUPLICATE_CODE',
        message: 'Já existe um item com este código.',
      });
    }
    if (error instanceof StockItemDuplicateSkuError) {
      throw new ConflictException({
        code: 'DUPLICATE_SKU',
        message: 'Já existe um item com este SKU.',
      });
    }
    if (error instanceof StockItemDuplicateBarcodeError) {
      throw new ConflictException({
        code: 'DUPLICATE_BARCODE',
        message: 'Já existe um item com este código de barras.',
      });
    }
    if (error instanceof StockItemValidationError) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }
    throw error;
  }
}
