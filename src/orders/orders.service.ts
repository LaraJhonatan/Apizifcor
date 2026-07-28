import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { UsuarioEntity } from '../users/entities/user.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderOrigin } from '../common/enums/order-origin.enum';
import { ProductStatus } from '../common/enums/product-status.enum';
import { WompiService } from '../wompi/wompi.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateManualOrderDto, ManualOrderItemDto, MarcarPagadaDto, UpdateManualOrderDto } from './dto/manual-order.dto';
import { buildComprobantePdf } from './comprobante.pdf';

interface BuiltItem {
  productId: string | null;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(UsuarioEntity) private readonly usuarioRepo: Repository<UsuarioEntity>,
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
        origen: OrderOrigin.WOMPI,
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
      where: { usuarioId, estado: OrderStatus.APPROVED },
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
    if (estado === OrderStatus.APPROVED) order.fechaPago = new Date();
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

  /** Descuenta stock de forma atómica; no falla la orden si ya no alcanza (deja log para revisión). */
  private async descontarStock(items: OrderItem[], orderId: string) {
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
          `Orden ${orderId}: sin stock suficiente para descontar ` +
            `${item.cantidad} x producto ${item.productId} ("${item.nombre}"). Revisar manualmente.`,
        );
      }
    }
  }

  private async descontarStockYLimpiarCarrito(order: Order) {
    const items = await this.itemRepo.find({ where: { orderId: order.id } });
    await this.descontarStock(items, order.id);

    if (!order.usuarioId) return;
    const cart = await this.cartRepo.findOne({ where: { usuarioId: order.usuarioId } });
    if (!cart) return;
    for (const item of items) {
      if (item.productId) {
        await this.cartItemRepo.delete({ cartId: cart.id, productId: item.productId });
      }
    }
  }

  // ── Órdenes manuales (venta por transferencia u otro medio fuera de PSE) ──

  private async buildManualItems(
    empresaId: string,
    dtoItems: ManualOrderItemDto[],
  ): Promise<{ items: BuiltItem[]; moneda: string }> {
    const items: BuiltItem[] = [];
    let moneda = 'COP';

    for (const it of dtoItems) {
      if (it.productId) {
        const product = await this.productRepo.findOne({
          where: { id: it.productId, empresaId, eliminado: false },
        });
        if (!product) {
          throw new BadRequestException(
            `El producto ${it.productId} no existe o no pertenece a tu empresa.`,
          );
        }
        moneda = product.moneda || moneda;
        items.push({
          productId: product.id,
          nombre: product.nombre,
          precioUnitario: it.precioUnitario,
          cantidad: it.cantidad,
          subtotal: it.precioUnitario * it.cantidad,
        });
      } else {
        if (!it.nombre) {
          throw new BadRequestException('Cada línea sin producto del catálogo necesita un nombre.');
        }
        items.push({
          productId: null,
          nombre: it.nombre,
          precioUnitario: it.precioUnitario,
          cantidad: it.cantidad,
          subtotal: it.precioUnitario * it.cantidad,
        });
      }
    }

    return { items, moneda };
  }

  async createManual(empresaId: string, dto: CreateManualOrderDto) {
    const { items, moneda } = await this.buildManualItems(empresaId, dto.items);
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const yaPagado = !!dto.yaPagado;

    if (yaPagado && !dto.medioPago) {
      throw new BadRequestException('Indica el medio de pago si la orden ya está pagada.');
    }

    let order = await this.orderRepo.save(
      this.orderRepo.create({
        origen: OrderOrigin.MANUAL,
        empresaId,
        usuarioId: dto.comprador.usuarioId ?? null,
        compradorNombre: dto.comprador.nombre,
        compradorDocumento: dto.comprador.documento || null,
        compradorEmail: dto.comprador.email || null,
        compradorTelefono: dto.comprador.telefono || null,
        reference: 'PENDIENTE',
        estado: yaPagado ? OrderStatus.APPROVED : OrderStatus.PENDING,
        subtotal,
        moneda,
        medioPagoManual: yaPagado ? dto.medioPago : null,
        fechaPago: yaPagado ? new Date() : null,
        envioDireccion: dto.envio?.direccion || null,
        envioCiudad: dto.envio?.ciudad || null,
        envioDepartamento: dto.envio?.departamento || null,
        envioNotas: dto.envio?.notas || null,
      }),
    );
    order.reference = `ZIFCOR-MAN-${order.id}`.toUpperCase();
    order = await this.orderRepo.save(order);

    const orderItems = items.map((i) => this.itemRepo.create({ orderId: order.id, ...i }));
    await this.itemRepo.save(orderItems);

    if (yaPagado) {
      await this.descontarStock(orderItems, order.id);
    }

    return this.getManualOrderForEmpresa(order.id, empresaId);
  }

  async updateManual(id: string, empresaId: string, dto: UpdateManualOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id, empresaId, origen: OrderOrigin.MANUAL },
    });
    if (!order) throw new NotFoundException('Orden manual no encontrada.');
    if (order.estado !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo se puede editar una orden manual que aún no esté pagada.');
    }

    const { items, moneda } = await this.buildManualItems(empresaId, dto.items);
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

    await this.itemRepo.delete({ orderId: order.id });
    const orderItems = items.map((i) => this.itemRepo.create({ orderId: order.id, ...i }));
    await this.itemRepo.save(orderItems);

    order.compradorNombre = dto.comprador.nombre;
    order.compradorDocumento = dto.comprador.documento || null;
    order.compradorEmail = dto.comprador.email || null;
    order.compradorTelefono = dto.comprador.telefono || null;
    order.usuarioId = dto.comprador.usuarioId ?? null;
    order.envioDireccion = dto.envio?.direccion || null;
    order.envioCiudad = dto.envio?.ciudad || null;
    order.envioDepartamento = dto.envio?.departamento || null;
    order.envioNotas = dto.envio?.notas || null;
    order.subtotal = subtotal;
    order.moneda = moneda;

    if (dto.yaPagado) {
      if (!dto.medioPago) throw new BadRequestException('Indica el medio de pago si la orden ya está pagada.');
      order.estado = OrderStatus.APPROVED;
      order.medioPagoManual = dto.medioPago;
      order.fechaPago = new Date();
    }

    await this.orderRepo.save(order);

    if (dto.yaPagado) {
      await this.descontarStock(orderItems, order.id);
    }

    return this.getManualOrderForEmpresa(order.id, empresaId);
  }

  async marcarPagadaManual(id: string, empresaId: string, dto: MarcarPagadaDto) {
    const order = await this.orderRepo.findOne({
      where: { id, empresaId, origen: OrderOrigin.MANUAL },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Orden manual no encontrada.');
    if (order.estado === OrderStatus.APPROVED) {
      throw new BadRequestException('Esta orden ya está marcada como pagada.');
    }

    order.estado = OrderStatus.APPROVED;
    order.medioPagoManual = dto.medioPago;
    order.fechaPago = new Date();
    await this.orderRepo.save(order);
    await this.descontarStock(order.items, order.id);

    return order;
  }

  async findManualForEmpresa(empresaId: string) {
    return this.orderRepo.find({
      where: { empresaId, origen: OrderOrigin.MANUAL },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getManualOrderForEmpresa(id: string, empresaId: string) {
    const order = await this.orderRepo.findOne({
      where: { id, empresaId, origen: OrderOrigin.MANUAL },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    return order;
  }

  // ── Comprobante de compra (PDF) ──

  async getOrderForComprobante(
    id: string,
    requester: { tipo: 'usuario' | 'empresa'; usuarioId?: number; empresaId?: string },
  ) {
    const where: Record<string, unknown> = { id };
    if (requester.tipo === 'usuario') where.usuarioId = requester.usuarioId;
    else where.empresaId = requester.empresaId;

    const order = await this.orderRepo.findOne({ where, relations: ['items'] });
    if (!order) throw new NotFoundException('Orden no encontrada.');
    if (order.estado !== OrderStatus.APPROVED) {
      throw new BadRequestException('El comprobante solo está disponible para órdenes pagadas.');
    }
    return order;
  }

  async generarComprobante(order: Order): Promise<Buffer> {
    let comprador = {
      nombre: order.compradorNombre,
      email: order.compradorEmail,
      telefono: order.compradorTelefono || order.envioTelefono,
      documento: order.compradorDocumento,
    };

    if (!comprador.nombre && order.usuarioId) {
      const usuario = await this.usuarioRepo.findOne({ where: { id: order.usuarioId } });
      if (usuario) {
        comprador = { ...comprador, nombre: usuario.nombreCompleto, email: usuario.email };
      }
    }

    return buildComprobantePdf(order, comprador);
  }
}
