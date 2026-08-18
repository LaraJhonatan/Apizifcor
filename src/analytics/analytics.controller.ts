import { Controller, Post, Get, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ClickProductoDto } from './dto/click-producto.dto';
import { ClickEmpresaDto } from './dto/click-empresa.dto';
import { BusquedaDto } from './dto/busqueda.dto';

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || null;
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('click-producto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra un clic a un producto (con límite anti-spam por IP)' })
  clickProducto(@Body() dto: ClickProductoDto, @Req() req: Request) {
    return this.service.registrarClickProducto(dto.productId, getClientIp(req));
  }

  @Post('click-empresa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra un clic a una empresa (con límite anti-spam por IP)' })
  clickEmpresa(@Body() dto: ClickEmpresaDto, @Req() req: Request) {
    return this.service.registrarClickEmpresa(dto.empresaId, getClientIp(req));
  }

  @Post('busqueda')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra un término buscado (con límite anti-spam por IP)' })
  busqueda(@Body() dto: BusquedaDto, @Req() req: Request) {
    return this.service.registrarBusqueda(dto.termino, getClientIp(req));
  }

  @Get('productos-mas-clickeados')
  @ApiOperation({ summary: 'Top productos más clickeados en los últimos 30 días' })
  productosMasClickeados(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 15;
    return this.service.getProductosMasClickeados(Number.isNaN(n) ? 15 : n);
  }
}
