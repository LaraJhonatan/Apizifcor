import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ClickProductoDto } from './dto/click-producto.dto';
import { ClickEmpresaDto } from './dto/click-empresa.dto';
import { BusquedaDto } from './dto/busqueda.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('click-producto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra un clic a un producto' })
  clickProducto(@Body() dto: ClickProductoDto) {
    return this.service.registrarClickProducto(dto.productId);
  }

  @Post('click-empresa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra un clic a una empresa' })
  clickEmpresa(@Body() dto: ClickEmpresaDto) {
    return this.service.registrarClickEmpresa(dto.empresaId);
  }

  @Post('busqueda')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra un término buscado' })
  busqueda(@Body() dto: BusquedaDto) {
    return this.service.registrarBusqueda(dto.termino);
  }

  @Get('productos-mas-clickeados')
  @ApiOperation({ summary: 'Top productos más clickeados en los últimos 30 días' })
  productosMasClickeados(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 15;
    return this.service.getProductosMasClickeados(Number.isNaN(n) ? 15 : n);
  }
}
