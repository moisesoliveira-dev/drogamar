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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PromocaoService } from '../application/services/promocao.service';
import {
  ProductNotFoundError,
  PromotionNotFoundError,
  PromotionValidationError,
} from '../domain/cart/errors';
import {
  PromotionListQueryDto,
  SimulatePromotionDto,
  UpsertPromotionDto,
} from './dto/promocao.dto';

@Controller('vendas/descontos')
@UseGuards(JwtAuthGuard)
export class PromocoesController {
  constructor(private readonly promocoes: PromocaoService) {}

  @Get('dashboard')
  dashboard() {
    return this.promocoes.dashboard();
  }

  @Get('lookups')
  lookups() {
    return this.promocoes.lookups();
  }

  @Post('simular')
  @HttpCode(200)
  async simulate(@Body() body: SimulatePromotionDto) {
    try {
      return await this.promocoes.simulate(body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get()
  list(@Query() query: PromotionListQueryDto) {
    return this.promocoes.list(query.search, query.status);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    try {
      return await this.promocoes.get(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: UpsertPromotionDto,
  ) {
    try {
      return await this.promocoes.create(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: UpsertPromotionDto,
  ) {
    try {
      return await this.promocoes.update(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/ativar')
  @HttpCode(200)
  async publish(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.promocoes.publish(user.id, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/pausar')
  @HttpCode(200)
  async pause(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.promocoes.pause(user.id, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.promocoes.cancel(user.id, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.promocoes.remove(user.id, id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof PromotionValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (
      error instanceof PromotionNotFoundError ||
      error instanceof ProductNotFoundError
    ) {
      throw new NotFoundException({
        code: error.name,
        message: error.message,
      });
    }
    throw error;
  }
}
