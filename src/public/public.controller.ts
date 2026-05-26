import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';

@ApiTags('Público')
@Controller('public')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Get('sectores')
  @ApiOperation({ summary: 'Lista sectores empresariales' })
  getSectores() {
    return this.svc.getSectores();
  }

  @Get('sectores/:slug/empresas')
  @ApiOperation({ summary: 'Lista empresas por sector' })
  getEmpresasBySector(@Param('slug') slug: string) {
    return this.svc.getEmpresasBySector(slug);
  }

  @Get('empresas/:id')
  @ApiOperation({ summary: 'Perfil público de empresa' })
  getEmpresa(@Param('id') id: string) {
    return this.svc.getEmpresa(id);
  }

  @Get('empresas/:id/productos')
  @ApiOperation({ summary: 'Productos públicos de empresa' })
  getProductosEmpresa(@Param('id') id: string, @Query() params: any) {
    return this.svc.getProductosEmpresa(id, params);
    //hola
  }
@Get('productos/search')
@ApiOperation({ summary: 'Búsqueda global de productos' })
searchProductos(@Query() params: any) {
  return this.svc.searchProductos(params);
}
  @Get('productos/:id')
  @ApiOperation({ summary: 'Detalle público de producto' })
  getProducto(@Param('id') id: string) {
    return this.svc.getProducto(id);
  }
}