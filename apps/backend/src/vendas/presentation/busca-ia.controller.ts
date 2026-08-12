import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { BuscaIaService } from '../application/services/busca-ia.service';
import { BuscaIaQueryDto } from './dto/busca-ia.dto';

@Controller('vendas/busca-ia')
@UseGuards(JwtAuthGuard)
export class BuscaIaController {
  constructor(private readonly busca: BuscaIaService) {}

  @Get('status')
  status() {
    return this.busca.llmStatus();
  }

  @Post()
  @HttpCode(200)
  search(@Body() body: BuscaIaQueryDto) {
    return this.busca.search(body);
  }
}
