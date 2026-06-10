import {
  Controller, Get, Post, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { SectoresService } from './sectores.service';
import { AssignSectoresDto } from './dto/assign-sector.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sectores')
export class SectoresController {
  constructor(private readonly sectoresService: SectoresService) {}

  // ─── Sectores públicos ───────────────────────────────────────

  @Get()
  findAll() {
    return this.sectoresService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.sectoresService.findBySlug(slug);
  }

  // ─── Sectores por producto ───────────────────────────────────

  @Get('producto/:productId')
  getSectoresProducto(@Param('productId') productId: string) {
    return this.sectoresService.getSectoresByProducto(productId);
  }

  @Post('producto/:productId')
  @UseGuards(JwtAuthGuard)
  assignSectoresProducto(
    @Param('productId') productId: string,
    @Body() dto: AssignSectoresDto,
  ) {
    return this.sectoresService.assignSectoresProducto(productId, dto);
  }

  @Delete('producto/:productId/:sectorId')
  @UseGuards(JwtAuthGuard)
  removeSectorProducto(
    @Param('productId') productId: string,
    @Param('sectorId') sectorId: string,
  ) {
    return this.sectoresService.removeSectorProducto(productId, sectorId);
  }

  // ─── Sectores por empresa ────────────────────────────────────

  @Get('empresa/:empresaId')
  getSectoresEmpresa(@Param('empresaId') empresaId: string) {
    return this.sectoresService.getSectoresByEmpresa(empresaId);
  }

  @Post('empresa/:empresaId')
  @UseGuards(JwtAuthGuard)
  assignSectoresEmpresa(
    @Param('empresaId') empresaId: string,
    @Body() dto: AssignSectoresDto,
  ) {
    return this.sectoresService.assignSectoresEmpresa(empresaId, dto);
  }

  @Delete('empresa/:empresaId/:sectorId')
  @UseGuards(JwtAuthGuard)
  removeSectorEmpresa(
    @Param('empresaId') empresaId: string,
    @Param('sectorId') sectorId: string,
  ) {
    return this.sectoresService.removeSectorEmpresa(empresaId, sectorId);
  }
}