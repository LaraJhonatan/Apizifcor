import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/create-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Carrito de compras — solo para usuarios (login con Gmail).
 * Todas las rutas requieren JWT válido de tipo 'usuario'.
 */
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** Extrae el id de usuario del token; rechaza cuentas empresa. */
  private getUsuarioId(req: any): number {
    const user = req.user;
    if (!user || user.tipo !== 'usuario' || !user.usuarioId) {
      throw new ForbiddenException(
        'El carrito solo está disponible para usuarios.',
      );
    }
    return Number(user.usuarioId);
  }

  @Get()
  getCart(@Request() req: any) {
    return this.cartService.getCart(this.getUsuarioId(req));
  }

  @Post('items')
  addItem(@Request() req: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(
      this.getUsuarioId(req),
      dto.productId,
      dto.cantidad ?? 1,
    );
  }

  @Patch('items/:productId')
  updateItem(
    @Request() req: any,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      this.getUsuarioId(req),
      productId,
      dto.cantidad,
    );
  }

  @Delete('items/:productId')
  removeItem(
    @Request() req: any,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.cartService.removeItem(this.getUsuarioId(req), productId);
  }

  @Delete()
  clear(@Request() req: any) {
    return this.cartService.clear(this.getUsuarioId(req));
  }
}
