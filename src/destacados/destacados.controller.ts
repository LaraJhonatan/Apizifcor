import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DestacadosService } from './destacados.service';

@ApiTags('Destacados')
@Controller('destacados')
export class DestacadosController {
  constructor(private readonly service: DestacadosService) {}

  @Get('llaves')
  @ApiOperation({ summary: 'Lista todas las llaves de secciones activas' })
  getLlaves() {
    return this.service.getLlaves();
  }

  @Get(':llave')
  @ApiOperation({ summary: 'Obtiene productos destacados por llave (destacados, gremios, etc.)' })
  getPorLlave(@Param('llave') llave: string) {
    return this.service.getPorLlave(llave);
  }
}