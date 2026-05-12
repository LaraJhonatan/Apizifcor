import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ChangeProductStatusDto } from './dto/change-status.dto';

@ApiTags('Productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos con filtros' })
  findAll(@Query() filters: FilterProductsDto) {
    return this.svc.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado del producto' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeProductStatusDto) {
    return this.svc.changeStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminación lógica' })
  remove(@Param('id') id: string) {
    return this.svc.softDelete(id);
  }
}