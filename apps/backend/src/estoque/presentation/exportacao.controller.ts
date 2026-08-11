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
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import {
  CancelStockExportCommand,
  CreateStockExportCommand,
  DownloadStockExportQuery,
  GetStockExportQuery,
  ListStockExportsQuery,
  PreviewExportCountQuery,
  RetryStockExportCommand,
} from '../application/commands/stock-export.commands';
import {
  CancelStockExportHandler,
  CreateStockExportHandler,
  DownloadStockExportHandler,
  GetExportMetaHandler,
  GetStockExportHandler,
  ListStockExportsHandler,
  PreviewExportCountHandler,
  RetryStockExportHandler,
} from '../application/handlers/stock-export.handlers';
import {
  ExportConcurrencyError,
  ExportExpiredError,
  ExportLimitError,
  ExportNotFoundError,
  ExportNotReadyError,
  ExportPermissionError,
  ExportValidationError,
} from '../domain/export/errors';
import type { ExportFilters } from '../domain/export/export-types';
import {
  CreateExportBodyDto,
  ListExportsQueryDto,
  PreviewExportBodyDto,
} from './dto/exportacao.dto';

@Controller('estoque/exportacao')
@UseGuards(JwtAuthGuard)
export class ExportacaoController {
  constructor(
    private readonly metaHandler: GetExportMetaHandler,
    private readonly previewHandler: PreviewExportCountHandler,
    private readonly createHandler: CreateStockExportHandler,
    private readonly listHandler: ListStockExportsHandler,
    private readonly getHandler: GetStockExportHandler,
    private readonly downloadHandler: DownloadStockExportHandler,
    private readonly cancelHandler: CancelStockExportHandler,
    private readonly retryHandler: RetryStockExportHandler,
  ) {}

  @Get('meta')
  meta() {
    return this.metaHandler.execute(true);
  }

  @Post('preview')
  @HttpCode(200)
  async preview(@Body() body: PreviewExportBodyDto) {
    try {
      return await this.previewHandler.execute(
        new PreviewExportCountQuery(
          body.type,
          body.filters as ExportFilters,
          body.sortBy,
          body.sortDir,
        ),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListExportsQueryDto,
  ) {
    return this.listHandler.execute(
      new ListStockExportsQuery(
        user.id,
        query.page ?? 1,
        query.pageSize ?? 10,
      ),
    );
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateExportBodyDto,
  ) {
    try {
      return await this.createHandler.execute(
        new CreateStockExportCommand(
          user.id,
          body.type,
          body.format,
          body.filters as ExportFilters,
          body.columns,
          body.sortBy,
          body.sortDir,
          body.fileName,
        ),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.getHandler.execute(new GetStockExportQuery(user.id, id));
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const file = await this.downloadHandler.execute(
        new DownloadStockExportQuery(user.id, id),
      );
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      );
      createReadStream(file.absolutePath).pipe(res);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.cancelHandler.execute(
        new CancelStockExportCommand(user.id, id),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post(':id/retry')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async retry(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ) {
    try {
      return await this.retryHandler.execute(
        new RetryStockExportCommand(user.id, id),
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof ExportNotFoundError) {
      throw new NotFoundException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof ExportPermissionError) {
      throw new ForbiddenException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof ExportValidationError) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    if (error instanceof ExportLimitError || error instanceof ExportConcurrencyError) {
      throw new UnprocessableEntityException({
        code: error.code,
        message: error.message,
      });
    }
    if (
      error instanceof ExportNotReadyError ||
      error instanceof ExportExpiredError
    ) {
      throw new BadRequestException({
        code: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}
