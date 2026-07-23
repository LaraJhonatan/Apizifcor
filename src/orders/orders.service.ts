import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { ProductStatus } from '../common/enums/product-status.enum';
import { WompiService } from '../wompi/wompi.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly wompi: WompiService,
    private readonly config: ConfigService,
  ) {}

  async checkout(usuarioId: number, envio: CheckoutDto) {
    const cart = await this.cartRepo.findOne({ where: { usuarioId } });
    if (!cart) throw new BadRequestException('Tu carrito está vacío.');

    const items = await this.cartItemRepo.find({
      where: { cartId: cart.id },
      relations: ['product', 'product.variantes'],
    });

    const pagables = items.filter(
      (it) =>
        it.product &&
        !it.product.eliminado &&
        it.product.estado === ProductStatus.PUBLISHED &&
        it.product.pagableEnLinea &&
        it.product.precioBase != null,
    );

    if (!pagables.length) {
      throw new BadRequestException('No hay productos pagables en línea en el carrito.');
    }

    for (const it of pagables) {
      const stock = this.effectiveStock(it.product);
      if (stock != null && it.cantidad > stock) {
        throw new BadRequestException(
          stock === 0
            ? `"${it.product.nombre}" se agotó. Quítalo del carrito para continuar.`
            : `De "${it.product.nombre}" solo quedan ${stock} unidad(es). Ajusta la cantidad en tu carrito.`,
        );
      }
    }

    const monedas = new Set(pagables.map((it) => it.product.moneda || 'COP'));
    if (monedas.size > 1) {
      throw new BadRequestException(
        'El carrito tiene productos en monedas distintas; sepáralos en compras diferentes.',
      );
    }
    const moneda = pagables[0].product.moneda || 'COP';
    const subtotal = pagables.reduce(
      (sum, it) => sum + Number(it.product.precioBase) * it.cantidad,
      0,
    );

    let order = await this.orderRepo.save(
      this.orderRepo.create({
        usuarioId,
        reference: 'PENDIENTE',
        estado: OrderStatus.PENDING,
        subtotal,
        moneda,
        envioNombreCompleto: envio.nombreCompleto,
        envioTelefono: envio.telefono,
        envioDireccion: envio.direccion,
        envioCiudad: envio.ciudad,
        envioDepartamento: envio.departamento,
        envioCodigoPostal: envio.codigoPostal || null,
        envioNotas: envio.notas || null,
      }),
    );
    order.reference = this.wompi.generateReference(order.id);
    order = await this.orderRepo.save(order);

    const orderItems = pagables.map((it) =>
      this.itemRepo.create({
        orderId: order.id,
        productId: it.product.id,
        nombre: it.product.nombre,
        precioUnitario: Number(it.product.precioBase),
        cantidad: it.cantidad,
        subtotal: Number(it.product.precioBase) * it.cantidad,
      }),
    );
    await this.itemRepo.save(orderItems);

    const amountInCents = Math.round(subtotal * 100);
    const signature = this.wompi.buildIntegritySignature(order.reference, amountInCents, moneda);

    return {
      orderId: order.id,
      reference: order.reference,
      amountInCents,
      currency: moneda,
      publicKey: this.wompi.publicKey,
      signature,
      environment: this.wompi.environment,
      redirectUrl: `${this.config.get('FRONTEND_URL')}/tienda/carrito`,
    };
  }

  async getById(id: string, usuarioId: number) {
    const order = await this.orderRepo.findOne({ where: { id, usuarioId }, relations: ['items'] });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    return order;
  }

  async findMine(usuarioId: number) {
    return this.orderRepo.find({
      where: { usuarioId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  private effectiveStock(product: Product): number | null {
    const activas = (product.variantes || []).filter((v) => v.activo);
    if (activas.length) {
      return activas.reduce((s, v) => s + (Number(v.stock) || 0), 0);
    }
    return product.stock != null ? Number(product.stock) : null;
  }

  async handleWompiEvent(payload: any) {
    const tx = payload?.data?.transaction;
    if (!tx?.reference) return;

    const order = await this.orderRepo.findOne({ where: { reference: tx.reference } });
    if (!order) return;

    if (order.estado === OrderStatus.APPROVED) return;

    const esperadoCents = Math.round(Number(order.subtotal) * 100);
    if (
      tx.status === 'APPROVED' &&
      (Number(tx.amount_in_cents) !== esperadoCents ||
        (tx.currency && tx.currency !== order.moneda))
    ) {
      this.logger.error(
        `Monto/moneda del pago no coincide con la orden ${order.id}: ` +
          `pagado ${tx.amount_in_cents} ${tx.currency}, esperado ${esperadoCents} ${order.moneda}. ` +
          `Transacción ${tx.id}. Se marca ERROR para revisión manual.`,
      );
      order.estado = OrderStatus.ERROR;
      order.wompiTransactionId = tx.id || null;
      order.wompiMetodoPago = tx.payment_method_type || null;
      await this.orderRepo.save(order);
      return;
    }

    const estado = this.mapWompiStatus(tx.status);
    order.estado = estado;
    order.wompiTransactionId = tx.id || null;
    order.wompiMetodoPago = tx.payment_method_type || null;
    await this.orderRepo.save(order);

    if (estado === OrderStatus.APPROVED) {
      await this.descontarStockYLimpiarCarrito(order);
    }
  }

  private mapWompiStatus(status: string): OrderStatus {
    switch (status) {
      case 'APPROVED':
        return OrderStatus.APPROVED;
      case 'DECLINED':
        return OrderStatus.DECLINED;
      case 'VOIDED':
        return OrderStatus.VOIDED;
      case 'ERROR':
        return OrderStatus.ERROR;
      default:
        return OrderStatus.PENDING;
    }
  }

  private async descontarStockYLimpiarCarrito(order: Order) {
    const items = await this.itemRepo.find({ where: { orderId: order.id } });
    const cart = await this.cartRepo.findOne({ where: { usuarioId: order.usuarioId } });

    for (const item of items) {
      if (!item.productId) continue;

      const result = await this.productRepo
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock - :cant' })
        .where('id = :id', { id: item.productId })
        .andWhere('(stock IS NULL OR stock >= :cant)')
        .setParameter('cant', item.cantidad)
        .execute();

      if (!result.affected) {
        this.logger.warn(
          `Orden ${order.id} aprobada pero sin stock suficiente para descontar ` +
            `${item.cantidad} x producto ${item.productId} ("${item.nombre}"). Revisar manualmente.`,
        );
      }

      if (cart) {
        await this.cartItemRepo.delete({ cartId: cart.id, productId: item.productId });
      }
    }
  }
}
