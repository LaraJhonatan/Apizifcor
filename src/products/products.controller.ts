import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ChangeProductStatusDto } from './dto/change-status.dto';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  create(@Req() req, @Body() dto: CreateProductDto) {
    return this.svc.create({ ...dto, empresaId: req.user.empresaId }, req.user.sub)
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos de mi empresa' })
  findAll(@Req() req, @Query() filters: FilterProductsDto) {
    return this.svc.findAll({ ...filters, empresaId: req.user.empresaId })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  getById(@Req() req, @Param('id') id: string) {
    return this.svc.getById(id, req.user.empresaId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Req() req, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.svc.update(id, dto, req.user.empresaId, req.user.sub)
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado del producto' })
  changeStatus(@Req() req, @Param('id') id: string, @Body() dto: ChangeProductStatusDto) {
    return this.svc.changeStatus(id, dto, req.user.empresaId, req.user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminación lógica' })
  remove(@Req() req, @Param('id') id: string) {
    return this.svc.softDelete(id, req.user.empresaId, req.user.sub)
  }
}