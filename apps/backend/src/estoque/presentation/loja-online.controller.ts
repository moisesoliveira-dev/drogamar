import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import {
  OnlineStoreDisconnectedError,
  OnlineStorePublishBlockedError,
  OnlineStoreService,
  OnlineStoreValidationError,
} from '../application/services/online-store.service';
import type {
  OnlineIntegrationStatus,
  OnlineListingPublishStatus,
  OnlineListingSyncStatus,
} from '../domain/online-store/online-store.types';
import {
  ConfigureChannelBodyDto,
  ListOnlineProductsQueryDto,
  ListSyncJobsQueryDto,
  StartSyncBodyDto,
  UpsertListingBodyDto,
} from './dto/loja-online.dto';

@Controller('estoque/loja-online')
@UseGuards(JwtAuthGuard)
export class LojaOnlineController {
  constructor(private readonly store: OnlineStoreService) {}

  @Get('overview')
  overview() {
    return this.store.getOverview();
  }

  @Put('canal')
  async configure(@Body() body: ConfigureChannelBodyDto) {
    const channel = await this.store.configureChannel(body);
    return {
      connected: channel.connectionStatus === 'CONNECTED',
      channel: {
        id: channel.id,
        name: channel.name,
        platform: channel.platform,
        baseUrl: channel.baseUrl,
        connectionStatus: channel.connectionStatus,
        hasCredentials: channel.hasCredentials,
        lastSyncAt: channel.lastSyncAt?.toISOString() ?? null,
        lastErrorMessage: channel.lastErrorMessage,
      },
    };
  }

  @Post('canal/disconnect')
  @HttpCode(200)
  async disconnect() {
    const channel = await this.store.disconnectChannel();
    return {
      connected: false,
      channel: channel
        ? {
            id: channel.id,
            name: channel.name,
            platform: channel.platform,
            baseUrl: channel.baseUrl,
            connectionStatus: channel.connectionStatus,
            hasCredentials: channel.hasCredentials,
            lastSyncAt: channel.lastSyncAt?.toISOString() ?? null,
            lastErrorMessage: channel.lastErrorMessage,
          }
        : null,
    };
  }

  @Get('produtos')
  async list(@Query() query: ListOnlineProductsQueryDto) {
    try {
      return await this.store.listProducts({
        search: query.search,
        status: (query.status as OnlineIntegrationStatus | 'ALL') ?? 'ALL',
        categoryId: query.categoryId,
        brandId: query.brandId,
        stock: (query.stock as 'ALL' | 'WITH_STOCK' | 'WITHOUT_STOCK' | 'LOW_STOCK') ?? 'ALL',
        sync: (query.sync as 'ALL' | OnlineListingSyncStatus) ?? 'ALL',
        publish: (query.publish as 'ALL' | OnlineListingPublishStatus) ?? 'ALL',
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('produtos/:itemId')
  async get(@Param('itemId') itemId: string) {
    try {
      const product = await this.store.getProduct(itemId);
      if (!product) {
        throw new NotFoundException({
          code: 'ITEM_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }
      return product;
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch('produtos/:itemId')
  async upsert(
    @Param('itemId') itemId: string,
    @Body() body: UpsertListingBodyDto,
  ) {
    try {
      const product = await this.store.upsertListing(itemId, body);
      if (!product) {
        throw new NotFoundException({
          code: 'ITEM_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }
      return product;
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('produtos/:itemId/publish')
  @HttpCode(200)
  async publish(@Param('itemId') itemId: string) {
    try {
      const product = await this.store.publish(itemId);
      if (!product) {
        throw new NotFoundException({
          code: 'ITEM_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }
      return product;
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('produtos/:itemId/unpublish')
  @HttpCode(200)
  async unpublish(@Param('itemId') itemId: string) {
    try {
      const product = await this.store.unpublish(itemId);
      if (!product) {
        throw new NotFoundException({
          code: 'ITEM_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }
      return product;
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post('sincronizar')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async sync(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: StartSyncBodyDto,
  ) {
    try {
      return await this.store.startSync({
        userId: user.id,
        syncProducts: body.syncProducts,
        syncStock: body.syncStock,
        syncPrices: body.syncPrices,
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get('sincronizacoes')
  listSync(@Query() query: ListSyncJobsQueryDto) {
    return this.store.listSyncJobs(query.page ?? 1, query.pageSize ?? 10);
  }

  @Get('sincronizacoes/:id')
  async getSync(@Param('id') id: string) {
    const job = await this.store.getSyncJob(id);
    if (!job) {
      throw new NotFoundException({
        code: 'SYNC_NOT_FOUND',
        message: 'Sincronização não encontrada.',
      });
    }
    return job;
  }

  private rethrow(error: unknown): never {
    if (error instanceof OnlineStoreDisconnectedError) {
      throw new UnprocessableEntityException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof OnlineStoreValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof OnlineStorePublishBlockedError) {
      throw new UnprocessableEntityException({
        code: error.code,
        message: error.message,
        pendings: error.pendings,
      });
    }
    if (error instanceof NotFoundException) throw error;
    throw error;
  }
}
