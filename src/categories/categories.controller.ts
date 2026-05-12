import {
  Controller, Get, Post, Patch, Param,
  Body, Delete, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto';

@ApiTags('Categorías')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear categoría o subcategoría' })
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(dto);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Árbol de categorías activas' })
  tree() {
    return this.svc.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de categoría con atributos' })
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Get(':id/atributos')
  @ApiOperation({ summary: 'Atributos dinámicos de una categoría' })
  getAtributos(@Param('id') id: string) {
    return this.svc.getAtributos(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoría' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.svc.updateCategory(id, dto);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar categoría' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivateCategory(id);
  }

  @Post('atributos')
  @ApiOperation({ summary: 'Crear definición de atributo' })
  createAtributo(@Body() dto: CreateAttributeDefinitionDto) {
    return this.svc.createAtributo(dto);
  }

  @Patch('atributos/:id')
  @ApiOperation({ summary: 'Actualizar definición de atributo' })
  updateAtributo(@Param('id') id: string, @Body() dto: Partial<CreateAttributeDefinitionDto>) {
    return this.svc.updateAtributo(id, dto);
  }

  @Post('atributos/opciones')
  @ApiOperation({ summary: 'Crear opción de atributo select/multiselect' })
  createOpcion(@Body() dto: CreateAttributeOptionDto) {
    return this.svc.createOpcion(dto);
  }

  @Delete('atributos/opciones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar opción de atributo' })
  deleteOpcion(@Param('id') id: string) {
    return this.svc.deleteOpcion(id);
  }
}