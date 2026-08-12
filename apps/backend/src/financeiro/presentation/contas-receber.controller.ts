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
import { ContasReceberService } from '../application/services/contas-receber.service';
import {
  ReceivableNotFoundError,
  ReceivablePermissionError,
  ReceivableValidationError,
} from '../domain/receivable/errors';
import {
  CancelReceivableDto,
  CreateReceivableDto,
  ListReceivablesQueryDto,
  RegisterReceiptDto,
  RenegotiateDto,
  ReverseReceiptDto,
  SearchCustomersQueryDto,
} from './dto/contas-receber.dto';

@Controller('financeiro/contas-receber')
@UseGuards(JwtAuthGuard)
export class ContasReceberController {
  constructor(private readonly service: ContasReceberService) {}

  @Get('lookups')
  lookups() {
    return this.service.getLookups();
  }

  @Get('clientes')
  customers(@Query() query: SearchCustomersQueryDto) {
    return this.service.searchCustomers(
      query.search,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  @Get('dashboard')
  dashboard(@Query() query: ListReceivablesQueryDto) {
    return this.service.dashboard(query);
  }

  @Get()
  list(@Query() query: ListReceivablesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    try {
      return await this.service.getById(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateReceivableDto,
  ) {
    try {
      return await this.service.create(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/receber')
  @HttpCode(200)
  async receive(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: RegisterReceiptDto,
  ) {
    try {
      return await this.service.registerReceipt(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/movimentos/:movementId/estornar')
  @HttpCode(200)
  async reverse(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Param('movementId') movementId: string,
    @Body() body: ReverseReceiptDto,
  ) {
    try {
      return await this.service.reverseReceipt(
        user.id,
        id,
        movementId,
        body.reason,
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/renegociar')
  @HttpCode(200)
  async renegotiate(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: RenegotiateDto,
  ) {
    try {
      return await this.service.renegotiate(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: CancelReceivableDto,
  ) {
    try {
      return await this.service.cancel(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof ReceivableValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof ReceivablePermissionError) {
      throw new ForbiddenException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof ReceivableNotFoundError) {
      throw new NotFoundException({
        code: error.name,
        message: error.message,
      });
    }
    throw error;
  }
}
