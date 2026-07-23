import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { WompiService } from '../wompi/wompi.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly wompi: WompiService,
    private readonly config: ConfigService,
  ) {}

  /** Crea una orden PENDING a partir de los ítems pagables del carrito y arma los datos del widget de Wompi. */
  async checkout(usuarioId: number, envio: CheckoutDto) {
    const cart = await this.cartRepo.findOne({ where: { usuarioId } });
    if (!cart) throw new BadRequestException('Tu carrito está vacío.');

    const items = await this.cartItemRepo.find({
      where: { cartId: cart.id },
      relations: ['product'],
    });

    // Solo los ítems pagables en línea (con precio) entran a la orden de pago;
    // los que requieren cotización se gestionan por WhatsApp, no aquí.
    // El precio y la cantidad se leen SIEMPRE del carrito guardado en el servidor
    // (nunca de algo que mande el navegador), así que nada de lo que se vea o se
    // manipule en el front cambia lo que realmente se cobra.
    const pagables = items.filter(
      (it) => it.product && !it.product.eliminado && it.product.pagableEnLinea && it.product.precioBase != null,
    );

    if (!pagables.length) {
      throw new BadRequestException('No hay productos pagables en línea en el carrito.');
    }

    const moneda = pagables[0].product.moneda || 'COP';
    const subtotal = pagables.reduce(
      (sum, it) => sum + Number(it.product.precioBase) * it.cantidad,
      0,
    );

    let order = await this.orderRepo.save(
      this.orderRepo.create({
        usuarioId,
        reference: 'PENDIENTE', // se reemplaza abajo, ya con el id definitivo
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

  /** Procesa un evento de Wompi cuya firma ya fue verificada. */
  async handleWompiEvent(payload: any) {
    const tx = payload?.data?.transaction;
    if (!tx?.reference) return;

    const order = await this.orderRepo.findOne({ where: { reference: tx.reference } });
    if (!order) return; // referencia desconocida — se ignora

    // Idempotencia básica: si ya quedó aprobada, no la volvemos a procesar
    // (evita descontar el stock dos veces si Wompi reenvía el evento).
    if (order.estado === OrderStatus.APPROVED) return;

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

  /**
   * Descuenta el stock de forma atómica (UPDATE condicionado, evita sobreventa
   * si dos personas pagan casi al mismo tiempo) y limpia esos ítems del carrito.
   */
  private async descontarStockYLimpiarCarrito(order: Order) {
    const items = await this.itemRepo.find({ where: { orderId: order.id } });
    const cart = await this.cartRepo.findOne({ where: { usuarioId: order.usuarioId } });

    for (const item of items) {
      if (!item.productId) continue;

      await this.productRepo
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock - :cant' })
        .where('id = :id', { id: item.productId })
        .andWhere('(stock IS NULL OR stock >= :cant)')
        .setParameter('cant', item.cantidad)
        .execute();

      if (cart) {
        await this.cartItemRepo.delete({ cartId: cart.id, productId: item.productId });
      }
    }
  }
}
