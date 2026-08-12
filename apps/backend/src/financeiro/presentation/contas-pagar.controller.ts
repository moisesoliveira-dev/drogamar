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
import { ContasPagarService } from '../application/services/contas-pagar.service';
import {
  PayableNotFoundError,
  PayablePermissionError,
  PayableValidationError,
} from '../domain/payable/errors';
import {
  ApprovalReasonDto,
  CancelPayableDto,
  CreatePayableDto,
  ListPayablesQueryDto,
  RegisterPaymentDto,
  RejectPayableDto,
  RenegotiatePayableDto,
  ReversePaymentDto,
  SchedulePayableDto,
  SearchSuppliersQueryDto,
} from './dto/contas-pagar.dto';

@Controller('financeiro/contas-pagar')
@UseGuards(JwtAuthGuard)
export class ContasPagarController {
  constructor(private readonly service: ContasPagarService) {}

  @Get('lookups')
  lookups() {
    return this.service.getLookups();
  }

  @Get('fornecedores')
  suppliers(@Query() query: SearchSuppliersQueryDto) {
    return this.service.searchSuppliers(
      query.search,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  @Get('dashboard')
  dashboard(@Query() query: ListPayablesQueryDto) {
    return this.service.dashboard(query);
  }

  @Get()
  list(@Query() query: ListPayablesQueryDto) {
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
    @Body() body: CreatePayableDto,
  ) {
    try {
      return await this.service.create(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/pagar')
  @HttpCode(200)
  async pay(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: RegisterPaymentDto,
  ) {
    try {
      return await this.service.registerPayment(user.id, id, body);
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
    @Body() body: ReversePaymentDto,
  ) {
    try {
      return await this.service.reversePayment(
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
    @Body() body: RenegotiatePayableDto,
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
    @Body() body: CancelPayableDto,
  ) {
    try {
      return await this.service.cancel(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/agendar')
  @HttpCode(200)
  async schedule(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: SchedulePayableDto,
  ) {
    try {
      return await this.service.schedulePayment(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/solicitar-aprovacao')
  @HttpCode(200)
  async requestApproval(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: ApprovalReasonDto,
  ) {
    try {
      return await this.service.requestApproval(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/aprovar')
  @HttpCode(200)
  async approve(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: ApprovalReasonDto,
  ) {
    try {
      return await this.service.approve(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/rejeitar')
  @HttpCode(200)
  async reject(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: RejectPayableDto,
  ) {
    try {
      return await this.service.reject(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof PayableValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof PayablePermissionError) {
      throw new ForbiddenException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof PayableNotFoundError) {
      throw new NotFoundException({
        code: error.name,
        message: error.message,
      });
    }
    throw error;
  }
}
