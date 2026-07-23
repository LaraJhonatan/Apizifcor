import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../common/enums/product-status.enum';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /** Devuelve el carrito del usuario, creándolo si no existe. */
  private async getOrCreateCart(usuarioId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({ where: { usuarioId } });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ usuarioId }));
    }
    return cart;
  }

  /**
   * Stock efectivo del producto:
   *  - Si tiene variantes activas → suma de sus stocks.
   *  - Si no → el stock propio del producto (null = sin control de inventario).
   */
  private effectiveStock(product: Product): number | null {
    const activas = (product.variantes || []).filter((v) => v.activo);
    if (activas.length) {
      return activas.reduce((s, v) => s + (Number(v.stock) || 0), 0);
    }
    return product.stock != null ? Number(product.stock) : null;
  }

  /** Carrito serializado con los datos actuales de cada producto. */
  async getCart(usuarioId: number) {
    const cart = await this.getOrCreateCart(usuarioId);

    const items = await this.itemRepo.find({
      where: { cartId: cart.id },
      relations: ['product', 'product.imagenes', 'product.variantes'],
      order: { createdAt: 'ASC' },
    });

    const lineas = items
      .filter((it) => it.product && !it.product.eliminado)
      .map((it) => {
        const p = it.product;
        const principal =
          p.imagenes?.find((i) => i.esPrincipal) || p.imagenes?.[0] || null;
        const precio = p.precioBase != null ? Number(p.precioBase) : null;
        return {
          id: it.id,
          productId: p.id,
          cantidad: it.cantidad,
          nombre: p.nombre,
          slug: p.slug,
          precioBase: precio,
          moneda: p.moneda || 'COP',
          pagableEnLinea: p.pagableEnLinea,
          stock: this.effectiveStock(p),
          imagenUrl: principal?.url || null,
          subtotal: precio != null ? precio * it.cantidad : null,
        };
      });

    const pagables = lineas.filter(
      (l) => l.pagableEnLinea && l.precioBase != null,
    );
    const cotizacion = lineas.filter(
      (l) => !l.pagableEnLinea || l.precioBase == null,
    );

    return {
      id: cart.id,
      items: lineas,
      resumen: {
        totalItems: lineas.reduce((s, l) => s + l.cantidad, 0),
        subtotalPagable: pagables.reduce((s, l) => s + (l.subtotal || 0), 0),
        totalPagables: pagables.length,
        totalCotizacion: cotizacion.length,
      },
    };
  }

  /** Agrega un producto (o suma cantidad si ya está). */
  async addItem(usuarioId: number, productId: string, cantidad = 1) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variantes'],
    });
    if (!product || product.eliminado) {
      throw new NotFoundException('El producto no existe.');
    }
    if (product.estado !== ProductStatus.PUBLISHED) {
      throw new BadRequestException('El producto no está disponible.');
    }

    const cart = await this.getOrCreateCart(usuarioId);

    const existing = await this.itemRepo.findOne({
      where: { cartId: cart.id, productId },
    });

    const yaEnCarrito = existing ? existing.cantidad : 0;
    const stock = this.effectiveStock(product);
    if (stock != null && yaEnCarrito + cantidad > stock) {
      throw new BadRequestException(
        stock === 0
          ? 'Producto agotado.'
          : `Solo hay ${stock} unidad(es) disponibles.`,
      );
    }

    if (existing) {
      existing.cantidad += cantidad;
      await this.itemRepo.save(existing);
    } else {
      await this.itemRepo.save(
        this.itemRepo.create({ cartId: cart.id, productId, cantidad }),
      );
    }

    return this.getCart(usuarioId);
  }

  /** Cambia la cantidad de una línea; si queda en 0 la elimina. */
  async updateItem(usuarioId: number, productId: string, cantidad: number) {
    const cart = await this.getOrCreateCart(usuarioId);
    const item = await this.itemRepo.findOne({
      where: { cartId: cart.id, productId },
    });
    if (!item) throw new NotFoundException('El producto no está en el carrito.');

    if (cantidad <= 0) {
      await this.itemRepo.remove(item);
      return this.getCart(usuarioId);
    }

    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variantes'],
    });
    const stock = product ? this.effectiveStock(product) : null;
    if (stock != null && cantidad > stock) {
      throw new BadRequestException(
        stock === 0
          ? 'Producto agotado.'
          : `Solo hay ${stock} unidad(es) disponibles.`,
      );
    }

    item.cantidad = cantidad;
    await this.itemRepo.save(item);

    return this.getCart(usuarioId);
  }

  /** Elimina una línea del carrito. */
  async removeItem(usuarioId: number, productId: string) {
    const cart = await this.getOrCreateCart(usuarioId);
    await this.itemRepo.delete({ cartId: cart.id, productId });
    return this.getCart(usuarioId);
  }

  /** Vacía el carrito. */
  async clear(usuarioId: number) {
    const cart = await this.getOrCreateCart(usuarioId);
    await this.itemRepo.delete({ cartId: cart.id });
    return this.getCart(usuarioId);
  }
}
