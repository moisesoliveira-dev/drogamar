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
import { CobrancasService } from '../application/services/cobrancas.service';
import {
  CollectionNotFoundError,
  CollectionPermissionError,
  CollectionValidationError,
} from '../domain/collection/errors';
import {
  AcordoDto,
  AssignDto,
  CreateCollectionCaseDto,
  CreatePromiseDto,
  ListCobrancasQueryDto,
  NextActionDto,
  PeriodQueryDto,
  ReasonDto,
  RegisterContactDto,
  ResolveCaseDto,
} from './dto/cobrancas.dto';

@Controller('financeiro/cobrancas')
@UseGuards(JwtAuthGuard)
export class CobrancasController {
  constructor(private readonly service: CobrancasService) {}

  @Get('lookups')
  lookups() {
    return this.service.getLookups();
  }

  @Get('dashboard')
  dashboard(@Query() query: PeriodQueryDto) {
    return this.service.dashboard(query.period ?? 'MONTH');
  }

  @Get('aging')
  aging() {
    return this.service.aging();
  }

  @Get('agenda')
  agenda(@Query() query: PeriodQueryDto) {
    return this.service.agenda(query.period ?? 'WEEK');
  }

  @Get('eficiencia')
  eficiencia(@Query() query: PeriodQueryDto) {
    return this.service.eficiencia(query.period ?? 'MONTH');
  }

  @Get()
  list(@Query() query: ListCobrancasQueryDto) {
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
    @Body() body: CreateCollectionCaseDto,
  ) {
    try {
      return await this.service.create(user.id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/contatos')
  @HttpCode(200)
  async contact(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: RegisterContactDto,
  ) {
    try {
      return await this.service.registerContact(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/promessas')
  @HttpCode(200)
  async promise(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: CreatePromiseDto,
  ) {
    try {
      return await this.service.createPromise(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/promessas/:promiseId/cancelar')
  @HttpCode(200)
  async cancelPromise(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Param('promiseId') promiseId: string,
  ) {
    try {
      return await this.service.cancelPromise(user.id, id, promiseId);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/responsavel')
  @HttpCode(200)
  async assign(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: AssignDto,
  ) {
    try {
      return await this.service.assign(user.id, id, body.assigneeId);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/proxima-acao')
  @HttpCode(200)
  async nextAction(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: NextActionDto,
  ) {
    try {
      return await this.service.setNextAction(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: ReasonDto,
  ) {
    try {
      return await this.service.cancel(user.id, id, body.reason);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/resolver')
  @HttpCode(200)
  async resolve(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: ResolveCaseDto,
  ) {
    try {
      return await this.service.resolve(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/acordo')
  @HttpCode(200)
  async acordo(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: AcordoDto,
  ) {
    try {
      return await this.service.acordo(user.id, id, body);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof CollectionNotFoundError) {
      throw new NotFoundException({
        message: error.message,
        code: 'NOT_FOUND',
      });
    }
    if (error instanceof CollectionPermissionError) {
      throw new ForbiddenException({
        message: error.message,
        code: error.code,
      });
    }
    if (error instanceof CollectionValidationError) {
      throw new BadRequestException({
        message: error.message,
        code: error.code,
      });
    }
    throw error;
  }
}
