import {
  Injectable, Logger, OnModuleInit, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { LogisticaVehiculo } from './entities/logistica-vehiculo.entity';
import { LogisticaRuta } from './entities/logistica-ruta.entity';
import { LogisticaTarifa } from './entities/logistica-tarifa.entity';
import { LogisticaServicio } from './entities/logistica-servicio.entity';
import { LogisticaEditor } from './entities/logistica-editor.entity';
import { LogisticaCotizacion } from './entities/logistica-cotizacion.entity';
import { LogisticaAjuste } from './entities/logistica-ajuste.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderOrigin } from '../common/enums/order-origin.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { WompiService } from '../wompi/wompi.service';
import { OrdersService } from '../orders/orders.service';
import { MailService } from '../auth/services/mail.service';

/** Cuenta con sesión iniciada al cotizar (usuario comprador o empresa). */
export interface CuentaLogistica {
  usuarioId?: number | null;
  empresaId?: string | null;
}

/** 'ver' permite también a las empresas editoras de logística; 'pagar' solo al dueño. */
type UsoCotizacion = 'ver' | 'pagar';
import { buildComprobantePdf } from '../orders/comprobante.pdf';
import { CotizarDto, ConfirmarCotizacionDto } from './dto/cotizar.dto';
import {
  CreateVehiculoDto, UpdateVehiculoDto, CreateRutaDto, UpdateRutaDto,
  CreateServicioDto, UpdateServicioDto, TarifaItemDto, GuardarImagenesDto,
} from './dto/admin-logistica.dto';
import { SEED_ORIGEN, SEED_VEHICULOS, SEED_RUTAS, SEED_SERVICIOS, SEED_IMAGENES } from './logistica.seed';

const MENSAJE_EXCEDE =
  'Las características de esta carga exceden las capacidades de los vehículos disponibles. ' +
  'Esta carga requiere una cotización especial.';

/**
 * Espacio de carga máximo por defecto (furgón/semirremolque estándar en Colombia) para las medidas
 * que un vehículo no tenga configuradas. Evita que una medida vacía se tome como "sin límite".
 */
const LIMITE_VIAL = { largoM: 13.5, anchoM: 2.45, altoM: 2.6 };

/** Más unidades que esto se cotiza a mano (y evita desbordar la columna int al guardar). */
const MAX_UNIDADES = 1_000_000;

/** decimal de MSSQL llega como string; null se conserva. */
const num = (v: unknown): number | null => (v == null ? null : Number(v));

export interface ServicioElegido {
  id: string;
  nombre: string;
  precio: number;
}

/** origen/destino van en el sentido que eligió el cliente (una ruta sirve en ambos sentidos). */
type Calculo = { origen: string; destino: string } & (
  | {
      ok: true;
      ruta: LogisticaRuta;
      vehiculo: LogisticaVehiculo;
      volumenM3: number;
      valorBase: number;
      margenPct: number;
      valorTransporte: number;
      servicios: ServicioElegido[];
      totalServicios: number;
      total: number;
    }
  | { ok: false; ruta: LogisticaRuta; volumenM3: number; mensaje: string; detalle: string; sugerencia: string }
);

@Injectable()
export class LogisticaService implements OnModuleInit {
  private readonly logger = new Logger(LogisticaService.name);

  constructor(
    @InjectRepository(LogisticaVehiculo) private readonly vehiculoRepo: Repository<LogisticaVehiculo>,
    @InjectRepository(LogisticaRuta) private readonly rutaRepo: Repository<LogisticaRuta>,
    @InjectRepository(LogisticaTarifa) private readonly tarifaRepo: Repository<LogisticaTarifa>,
    @InjectRepository(LogisticaServicio) private readonly servicioRepo: Repository<LogisticaServicio>,
    @InjectRepository(LogisticaEditor) private readonly editorRepo: Repository<LogisticaEditor>,
    @InjectRepository(LogisticaCotizacion) private readonly cotizacionRepo: Repository<LogisticaCotizacion>,
    @InjectRepository(LogisticaAjuste) private readonly ajusteRepo: Repository<LogisticaAjuste>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly wompi: WompiService,
    private readonly ordersService: OrdersService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Margen sobre el valor base, como fracción (0.30 = 30 %). Configurable con LOGISTICA_MARGEN. */
  private get margen(): number {
    const v = Number(this.config.get('LOGISTICA_MARGEN', '0.30'));
    return Number.isFinite(v) && v >= 0 ? v : 0.3;
  }

  private get vigenciaDias(): number {
    const v = Number(this.config.get('LOGISTICA_VIGENCIA_DIAS', '15'));
    return Number.isFinite(v) && v > 0 ? v : 15;
  }

  async onModuleInit() {
    try {
      await this.cargarDatosInicialesSiVacio();
      await this.cargarImagenesPorDefecto();
    } catch (err) {
      this.logger.error('No se pudieron cargar los datos iniciales de logística', err);
    }
  }

  /** Crea solo las claves de imagen que falten, sin tocar las que ya se hayan cambiado. */
  private async cargarImagenesPorDefecto() {
    const existentes = new Set((await this.ajusteRepo.find()).map((a) => a.clave));
    const faltantes = Object.entries(SEED_IMAGENES).filter(([clave]) => !existentes.has(clave));
    if (faltantes.length) {
      await this.ajusteRepo.save(faltantes.map(([clave, valor]) => this.ajusteRepo.create({ clave, valor })));
    }
  }

  /** Imágenes del banner de inicio y del encabezado del cotizador. */
  async imagenes(): Promise<Record<string, string>> {
    const ajustes = await this.ajusteRepo.find({ where: { clave: In(Object.keys(SEED_IMAGENES)) } });
    const resultado = { ...SEED_IMAGENES };
    for (const a of ajustes) if (a.valor) resultado[a.clave] = a.valor;
    return resultado;
  }

  async guardarImagenes(dto: GuardarImagenesDto) {
    for (const clave of Object.keys(SEED_IMAGENES)) {
      if (!(clave in dto)) continue;
      // Vacío = volver a la imagen por defecto.
      const valor = (dto[clave] as string | null)?.trim() || SEED_IMAGENES[clave];
      await this.ajusteRepo.save(this.ajusteRepo.create({ clave, valor }));
    }
    return this.imagenes();
  }

  private async cargarDatosInicialesSiVacio() {
    if (await this.vehiculoRepo.count()) return;

    await this.dataSource.transaction(async (m) => {
      const vehiculos = await m.getRepository(LogisticaVehiculo).save(
        SEED_VEHICULOS.map((v, i) => m.getRepository(LogisticaVehiculo).create({ ...v, orden: i + 1 })),
      );

      for (const [i, r] of SEED_RUTAS.entries()) {
        const ruta = await m.getRepository(LogisticaRuta).save(
          m.getRepository(LogisticaRuta).create({
            origen: SEED_ORIGEN,
            destino: r.destino,
            tipo: r.tipo,
            entregasIncluidas: r.entregasIncluidas,
            orden: i + 1,
          }),
        );
        const tarifas = r.tarifas
          .map((valorBase, idx) => ({ valorBase, vehiculo: vehiculos[idx] }))
          .filter((t) => t.valorBase != null && t.vehiculo)
          .map((t) =>
            m.getRepository(LogisticaTarifa).create({
              rutaId: ruta.id,
              vehiculoId: t.vehiculo.id,
              valorBase: t.valorBase,
            }),
          );
        await m.getRepository(LogisticaTarifa).save(tarifas);
      }

      await m.getRepository(LogisticaServicio).save(
        SEED_SERVICIOS.map((s, i) => m.getRepository(LogisticaServicio).create({ ...s, orden: i + 1 })),
      );
    });

    this.logger.log('Datos iniciales de logística cargados desde el Excel de tarifas.');
  }

  // ── Público ──

  async catalogo() {
    const [rutas, vehiculos, servicios, imagenes] = await Promise.all([
      this.rutaRepo.find({ where: { activo: true }, order: { orden: 'ASC', destino: 'ASC' } }),
      this.vehiculoRepo.find({ where: { activo: true }, order: { orden: 'ASC' } }),
      this.servicioRepo.find({ where: { activo: true }, order: { orden: 'ASC', nombre: 'ASC' } }),
      this.imagenes(),
    ]);

    return {
      imagenes,
      rutas: rutas.map((r) => ({
        id: r.id,
        origen: r.origen,
        destino: r.destino,
        tipo: r.tipo,
        entregasIncluidas: r.entregasIncluidas,
      })),
      vehiculos: vehiculos.map((v) => this.vehiculoPublico(v)),
      servicios: servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        precio: num(s.precio),
      })),
      moneda: 'COP',
    };
  }

  /** Vista previa en vivo: no guarda nada y nunca expone el valor base ni el margen. */
  async cotizar(dto: CotizarDto) {
    const calc = await this.calcular(dto);
    const base = {
      ruta: { id: calc.ruta.id, origen: calc.origen, destino: calc.destino, tipo: calc.ruta.tipo },
      volumenM3: calc.volumenM3,
      moneda: 'COP',
    };
    if (calc.ok === false) {
      return { ...base, ok: false, mensaje: calc.mensaje, detalle: calc.detalle, sugerencia: calc.sugerencia };
    }
    return {
      ...base,
      ok: true,
      vehiculo: this.vehiculoPublico(calc.vehiculo),
      valorTransporte: calc.valorTransporte,
      servicios: calc.servicios,
      totalServicios: calc.totalServicios,
      total: calc.total,
    };
  }

  async confirmar(dto: ConfirmarCotizacionDto, cuenta: CuentaLogistica = {}) {
    const calc = await this.calcular(dto);
    if (calc.ok === false) throw new BadRequestException(calc.mensaje);

    const token = randomUUID();
    const c = dto.comprador;

    const { order, cotizacion } = await this.dataSource.transaction(async (m) => {
      const orderRepo = m.getRepository(Order);
      let order = await orderRepo.save(
        orderRepo.create({
          origen: OrderOrigin.LOGISTICA,
          reference: `TMP-${token}`,
          estado: OrderStatus.PENDING,
          subtotal: calc.total,
          moneda: 'COP',
          compradorNombre: c.nombre.trim(),
          compradorDocumento: `${c.tipoDocumento} ${c.documento.trim()}`,
          compradorEmail: c.email.trim(),
          compradorTelefono: c.telefono.trim(),
          envioDireccion: dto.puntoEntrega?.trim() || null,
          envioCiudad: calc.destino,
          envioNotas: dto.comentarios?.trim() || null,
        }),
      );
      order.reference = this.wompi.generateReference(order.id);
      order = await orderRepo.save(order);

      const itemRepo = m.getRepository(OrderItem);
      await itemRepo.save([
        itemRepo.create({
          orderId: order.id,
          productId: null,
          // Sin "→": la fuente estándar del PDF (Helvetica) no tiene ese carácter.
          nombre: `Transporte de ${calc.origen} a ${calc.destino} · ${calc.vehiculo.nombre} (${calc.vehiculo.codigo})`,
          precioUnitario: calc.valorTransporte,
          cantidad: 1,
          subtotal: calc.valorTransporte,
        }),
        ...calc.servicios.map((s) =>
          itemRepo.create({
            orderId: order.id,
            productId: null,
            nombre: s.nombre,
            precioUnitario: s.precio,
            cantidad: 1,
            subtotal: s.precio,
          }),
        ),
      ]);

      const vigenteHasta = new Date();
      vigenteHasta.setDate(vigenteHasta.getDate() + this.vigenciaDias);

      const cotRepo = m.getRepository(LogisticaCotizacion);
      const cotizacion = await cotRepo.save(
        cotRepo.create({
          token,
          orderId: order.id,
          rutaId: calc.ruta.id,
          origen: calc.origen,
          destino: calc.destino,
          puntoRecogida: dto.puntoRecogida?.trim() || null,
          puntoEntrega: dto.puntoEntrega?.trim() || null,
          producto: dto.producto.trim(),
          descripcion: dto.descripcion?.trim() || null,
          tipoMercancia: dto.tipoMercancia?.trim() || null,
          pesoKg: dto.pesoKg,
          largoM: dto.largoM,
          anchoM: dto.anchoM,
          altoM: dto.altoM,
          cantidad: dto.cantidad,
          volumenM3: calc.volumenM3,
          comentarios: dto.comentarios?.trim() || null,
          vehiculoId: calc.vehiculo.id,
          vehiculoCodigo: calc.vehiculo.codigo,
          vehiculoNombre: calc.vehiculo.nombre,
          valorBase: calc.valorBase,
          margenPct: calc.margenPct,
          valorTransporte: calc.valorTransporte,
          serviciosJson: JSON.stringify(calc.servicios),
          totalServicios: calc.totalServicios,
          total: calc.total,
          moneda: 'COP',
          vigenteHasta,
          compradorTipoDocumento: c.tipoDocumento,
          compradorDocumento: c.documento.trim(),
          compradorNombre: c.nombre.trim(),
          compradorEmail: c.email.trim(),
          compradorTelefono: c.telefono.trim(),
          compradorDireccion: c.direccion.trim(),
          compradorCiudad: c.ciudad.trim(),
          usuarioId: cuenta.usuarioId ?? null,
          empresaId: cuenta.empresaId ?? null,
        }),
      );

      return { order, cotizacion };
    });

    this.enviarCorreoCotizacion(cotizacion);

    return {
      token: cotizacion.token,
      numero: this.numero(cotizacion.id),
      pago: this.datosPago(order, cotizacion.token),
    };
  }

  /** Correo con el enlace para volver a la cotización. Si falla, la cotización sigue siendo válida. */
  private enviarCorreoCotizacion(c: LogisticaCotizacion) {
    const fecha = (d: Date) =>
      new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
    this.mail
      .enviarCotizacionLogistica(c.compradorEmail, {
        nombre: c.compradorNombre,
        numero: this.numero(c.id),
        ruta: `${c.origen} → ${c.destino} · ${c.vehiculoNombre}`,
        total: `$${Number(c.total).toLocaleString('es-CO', { maximumFractionDigits: 0 })} ${c.moneda}`,
        vigencia: fecha(c.vigenteHasta),
        enlace: this.enlaceCotizacion(c.token),
      })
      .catch((err) => this.logger.warn(`No se pudo enviar el correo de la cotización ${c.id}: ${err?.message || err}`));
  }

  private enlaceCotizacion(token: string) {
    return `${this.config.get('FRONTEND_URL')}/tienda/logistica/cotizacion/${token}`;
  }

  /** Cotizaciones generadas con la sesión de esta cuenta, más recientes primero. */
  async misCotizaciones(cuenta: CuentaLogistica) {
    const where = cuenta.empresaId
      ? { empresaId: cuenta.empresaId }
      : cuenta.usuarioId
        ? { usuarioId: cuenta.usuarioId }
        : null;
    if (!where) return [];
    const cotizaciones = await this.cotizacionRepo.find({ where, order: { id: 'DESC' }, take: 50 });
    return this.resumenes(cotizaciones);
  }

  /** Resumen de las cotizaciones que el navegador del cliente tiene guardadas. */
  async resumenPorTokens(tokens: string[], cuenta: CuentaLogistica = {}) {
    const unicos = [...new Set(tokens)];
    if (!unicos.length) return [];
    const cotizaciones = await this.cotizacionRepo.find({ where: { token: In(unicos) }, order: { id: 'DESC' } });
    // Las que pertenecen a otra cuenta no se listan aunque el navegador tenga el enlace.
    return this.resumenes(cotizaciones.filter((c) => this.esDueno(c, cuenta)));
  }

  /** Recupera el enlace de una cotización con su número y el correo con que se generó. */
  async buscar(numero: string, email: string, cuenta: CuentaLogistica = {}) {
    const id = Number(String(numero).replace(/\D/g, ''));
    const noEncontrada = new NotFoundException('No encontramos una cotización con ese número y correo.');
    if (!Number.isInteger(id) || id <= 0) throw noEncontrada;
    const c = await this.cotizacionRepo.findOne({ where: { id } });
    if (!c || c.compradorEmail.trim().toLowerCase() !== email.trim().toLowerCase()) throw noEncontrada;
    if (this.tieneDueno(c)) await this.assertAcceso(c, cuenta, 'pagar');
    return { token: c.token, numero: this.numero(c.id) };
  }

  private async resumenes(cotizaciones: LogisticaCotizacion[]) {
    const orderIds = cotizaciones.map((c) => c.orderId).filter(Boolean);
    const orders = orderIds.length ? await this.orderRepo.find({ where: { id: In(orderIds) } }) : [];
    const porId = new Map(orders.map((o) => [o.id.toUpperCase(), o]));
    return cotizaciones.map((c) => ({
      token: c.token,
      numero: this.numero(c.id),
      createdAt: c.createdAt,
      vigenteHasta: c.vigenteHasta,
      vencida: new Date(c.vigenteHasta) < new Date(),
      origen: c.origen,
      destino: c.destino,
      producto: c.producto,
      vehiculo: c.vehiculoNombre,
      total: num(c.total),
      moneda: c.moneda,
      estadoPago: (c.orderId && porId.get(c.orderId.toUpperCase())?.estado) || OrderStatus.PENDING,
    }));
  }

  async obtenerPorToken(token: string, cuenta: CuentaLogistica = {}) {
    const { cotizacion, order } = await this.cargarPorToken(token, cuenta, 'ver');
    return { ...this.cotizacionPublica(cotizacion, order), esDueno: this.esDueno(cotizacion, cuenta) };
  }

  /** Parámetros del widget de Wompi para pagar (o reintentar) una cotización pendiente. */
  async iniciarPago(token: string, cuenta: CuentaLogistica = {}) {
    const { cotizacion, order } = await this.cargarPorToken(token, cuenta, 'pagar');
    if (order.estado === OrderStatus.APPROVED) {
      throw new BadRequestException('Esta cotización ya está pagada.');
    }
    if (new Date(cotizacion.vigenteHasta) < new Date()) {
      throw new BadRequestException('Esta cotización ya venció. Genera una nueva para ver el precio actualizado.');
    }
    return this.datosPago(order, cotizacion.token);
  }

  /**
   * Consulta la transacción directamente en Wompi y aplica el resultado a la orden.
   * Complementa el webhook: sirve cuando el cliente vuelve del pago antes de que llegue
   * el evento (o en local, donde Wompi no puede llamar al webhook).
   */
  async verificarPago(token: string, transactionId: string, cuenta: CuentaLogistica = {}) {
    const { order } = await this.cargarPorToken(token, cuenta, 'pagar');

    if (order.estado !== OrderStatus.APPROVED) {
      const base = this.wompi.environment.startsWith('prod')
        ? 'https://production.wompi.co/v1'
        : 'https://sandbox.wompi.co/v1';

      let tx: any;
      try {
        const res = await fetch(`${base}/transactions/${encodeURIComponent(transactionId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        tx = (await res.json())?.data;
      } catch (err) {
        this.logger.warn(`No se pudo consultar la transacción ${transactionId} en Wompi: ${err}`);
        throw new BadRequestException('No se pudo consultar el estado del pago. Intenta de nuevo en un momento.');
      }

      if (!tx || tx.reference !== order.reference) {
        throw new BadRequestException('La transacción no corresponde a esta cotización.');
      }
      await this.ordersService.handleWompiEvent({ data: { transaction: tx } });
    }

    return this.obtenerPorToken(token, cuenta);
  }

  async pdf(token: string, cuenta: CuentaLogistica = {}): Promise<{ buffer: Buffer; numero: string }> {
    const { cotizacion } = await this.cargarPorToken(token, cuenta, 'ver');
    const order = await this.orderRepo.findOne({ where: { id: cotizacion.orderId }, relations: ['items'] });
    if (!order) throw new NotFoundException('Cotización no encontrada.');

    const numero = this.numero(cotizacion.id);
    const pagado = order.estado === OrderStatus.APPROVED;
    const kg = num(cotizacion.pesoKg);

    const buffer = await buildComprobantePdf(
      order,
      {
        nombre: cotizacion.compradorNombre,
        email: cotizacion.compradorEmail,
        telefono: cotizacion.compradorTelefono,
        documento: `${cotizacion.compradorTipoDocumento} ${cotizacion.compradorDocumento}`,
      },
      {
        numero,
        secciones: [
          {
            titulo: 'Detalle del transporte',
            filas: [
              ['Ruta', `De ${cotizacion.origen} a ${cotizacion.destino}`],
              ...(cotizacion.puntoRecogida ? [['Punto de recogida', cotizacion.puntoRecogida] as [string, string]] : []),
              ...(cotizacion.puntoEntrega ? [['Punto de entrega', cotizacion.puntoEntrega] as [string, string]] : []),
              ['Vehículo', `${cotizacion.vehiculoNombre} (${cotizacion.vehiculoCodigo})`],
              ['Mercancía', cotizacion.producto + (cotizacion.tipoMercancia ? ` · ${cotizacion.tipoMercancia}` : '')],
              ['Peso total', kg >= 1000 ? `${(kg / 1000).toLocaleString('es-CO')} t` : `${kg.toLocaleString('es-CO')} kg`],
              [
                'Medidas por unidad (L × A × H)',
                `${num(cotizacion.largoM)} × ${num(cotizacion.anchoM)} × ${num(cotizacion.altoM)} m · ${cotizacion.cantidad} unidad(es)`,
              ],
              ['Volumen total', `${num(cotizacion.volumenM3)} m³`],
              ['Dirección de facturación', `${cotizacion.compradorDireccion}, ${cotizacion.compradorCiudad}`],
            ],
          },
        ],
        notaPie: pagado
          ? undefined
          : `Cotización válida hasta el ${new Date(cotizacion.vigenteHasta).toLocaleDateString('es-CO', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}.`,
      },
    );

    return { buffer, numero };
  }

  // ── Dashboard (solo empresas autorizadas en logistica_editores) ──

  async esEditor(empresaId: string): Promise<boolean> {
    return (await this.editorRepo.count({ where: { empresaId } })) > 0;
  }

  async assertEditor(empresaId: string) {
    if (!(await this.esEditor(empresaId))) {
      throw new ForbiddenException('Tu empresa no tiene permiso para administrar la logística.');
    }
  }

  async datosAdmin() {
    const [vehiculos, rutas, tarifas, servicios, imagenes] = await Promise.all([
      this.vehiculoRepo.find({ order: { orden: 'ASC' } }),
      this.rutaRepo.find({ order: { orden: 'ASC', destino: 'ASC' } }),
      this.tarifaRepo.find(),
      this.servicioRepo.find({ order: { orden: 'ASC', nombre: 'ASC' } }),
      this.imagenes(),
    ]);
    return {
      margenPct: Math.round(this.margen * 10000) / 100,
      imagenes,
      vehiculos: vehiculos.map((v) => this.vehiculoAdmin(v)),
      rutas,
      tarifas: tarifas.map((t) => ({ rutaId: t.rutaId, vehiculoId: t.vehiculoId, valorBase: num(t.valorBase) })),
      servicios: servicios.map((s) => ({ ...s, precio: num(s.precio) })),
    };
  }

  async crearVehiculo(dto: CreateVehiculoDto) {
    const v = await this.vehiculoRepo.save(this.vehiculoRepo.create(dto));
    return this.vehiculoAdmin(v);
  }

  async actualizarVehiculo(id: string, dto: UpdateVehiculoDto) {
    const v = await this.vehiculoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Vehículo no encontrado.');
    Object.assign(v, dto);
    return this.vehiculoAdmin(await this.vehiculoRepo.save(v));
  }

  async crearRuta(dto: CreateRutaDto) {
    const datos = { ...dto, origen: dto.origen.trim(), destino: dto.destino.trim() };
    await this.validarRuta(datos.origen, datos.destino, datos.tipo ?? 'nacional');
    if (datos.orden == null) {
      // Sin orden explícito, la ruta nueva va al final de la lista.
      const ultima = await this.rutaRepo.findOne({ where: {}, order: { orden: 'DESC' } });
      datos.orden = (ultima?.orden ?? 0) + 1;
    }
    return this.rutaRepo.save(this.rutaRepo.create(datos));
  }

  async actualizarRuta(id: string, dto: UpdateRutaDto) {
    const r = await this.rutaRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Ruta no encontrada.');
    Object.assign(r, dto, {
      ...(dto.origen != null && { origen: dto.origen.trim() }),
      ...(dto.destino != null && { destino: dto.destino.trim() }),
    });
    await this.validarRuta(r.origen, r.destino, r.tipo, r.id);
    return this.rutaRepo.save(r);
  }

  /**
   * Una ruta sirve en ambos sentidos con el mismo precio, así que A→B y B→A son la misma:
   * no se permite repetirla (sin importar mayúsculas, tildes ni el orden de las ciudades).
   * Origen = destino solo tiene sentido como servicio urbano dentro de la ciudad.
   */
  private async validarRuta(origen: string, destino: string, tipo: string, excluirId?: string) {
    const clave = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const [a, b] = [clave(origen), clave(destino)];
    if (a === b && tipo !== 'urbano') {
      throw new BadRequestException('Si el origen y el destino son la misma ciudad, el tipo debe ser "Urbano".');
    }
    if (a !== b && tipo === 'urbano') {
      throw new BadRequestException('Una ruta urbana es dentro de una misma ciudad: origen y destino deben ser iguales.');
    }
    const repetida = (await this.rutaRepo.find()).find((r) => {
      if (excluirId && r.id.toUpperCase() === excluirId.toUpperCase()) return false;
      const [x, y] = [clave(r.origen), clave(r.destino)];
      return (x === a && y === b) || (x === b && y === a);
    });
    if (repetida) {
      throw new BadRequestException(
        `Ya existe la ruta ${repetida.origen} ↔ ${repetida.destino}${repetida.activo ? '' : ' (oculta)'}. ` +
          'Las rutas sirven en ambos sentidos con el mismo precio; edita esa en lugar de crear otra.',
      );
    }
  }

  async guardarTarifas(items: TarifaItemDto[]) {
    await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(LogisticaTarifa);
      const rutaIds = [...new Set(items.map((i) => i.rutaId))];
      const vehiculoIds = [...new Set(items.map((i) => i.vehiculoId))];
      const [rutas, vehiculos] = await Promise.all([
        rutaIds.length ? m.getRepository(LogisticaRuta).count({ where: { id: In(rutaIds) } }) : 0,
        vehiculoIds.length ? m.getRepository(LogisticaVehiculo).count({ where: { id: In(vehiculoIds) } }) : 0,
      ]);
      if (rutas !== rutaIds.length || vehiculos !== vehiculoIds.length) {
        throw new BadRequestException('Alguna ruta o vehículo de la tabla ya no existe. Recarga la página.');
      }

      for (const it of items) {
        const existente = await repo.findOne({ where: { rutaId: it.rutaId, vehiculoId: it.vehiculoId } });
        const valor = it.valorBase == null || it.valorBase <= 0 ? null : it.valorBase;
        if (valor == null) {
          if (existente) await repo.remove(existente);
        } else if (existente) {
          existente.valorBase = valor;
          await repo.save(existente);
        } else {
          await repo.save(repo.create({ rutaId: it.rutaId, vehiculoId: it.vehiculoId, valorBase: valor }));
        }
      }
    });
    return this.datosAdmin();
  }

  async crearServicio(dto: CreateServicioDto) {
    const s = await this.servicioRepo.save(this.servicioRepo.create(dto));
    return { ...s, precio: num(s.precio) };
  }

  async actualizarServicio(id: string, dto: UpdateServicioDto) {
    const s = await this.servicioRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Servicio no encontrado.');
    Object.assign(s, dto);
    const saved = await this.servicioRepo.save(s);
    return { ...saved, precio: num(saved.precio) };
  }

  async cotizacionesAdmin() {
    const cotizaciones = await this.cotizacionRepo.find({ order: { id: 'DESC' }, take: 300 });
    const orderIds = cotizaciones.map((c) => c.orderId).filter(Boolean);
    const orders = orderIds.length ? await this.orderRepo.find({ where: { id: In(orderIds) } }) : [];
    const porId = new Map(orders.map((o) => [o.id.toUpperCase(), o]));

    return cotizaciones.map((c) => {
      const o = c.orderId ? porId.get(c.orderId.toUpperCase()) : null;
      const valorBase = num(c.valorBase);
      const valorTransporte = num(c.valorTransporte);
      return {
        id: c.id,
        numero: this.numero(c.id),
        token: c.token,
        createdAt: c.createdAt,
        vigenteHasta: c.vigenteHasta,
        origen: c.origen,
        destino: c.destino,
        producto: c.producto,
        pesoKg: num(c.pesoKg),
        vehiculo: `${c.vehiculoNombre} (${c.vehiculoCodigo})`,
        valorBase,
        margenPct: num(c.margenPct),
        ganancia: valorTransporte - valorBase,
        valorTransporte,
        totalServicios: num(c.totalServicios),
        total: num(c.total),
        comprador: {
          nombre: c.compradorNombre,
          documento: `${c.compradorTipoDocumento} ${c.compradorDocumento}`,
          email: c.compradorEmail,
          telefono: c.compradorTelefono,
        },
        estadoPago: o?.estado || OrderStatus.PENDING,
        metodoPago: o?.wompiMetodoPago || null,
        fechaPago: o?.fechaPago || null,
      };
    });
  }

  // ── Cálculo ──

  private async calcular(dto: CotizarDto): Promise<Calculo> {
    const ruta = await this.rutaRepo.findOne({ where: { id: dto.rutaId, activo: true } });
    if (!ruta) throw new BadRequestException('El destino seleccionado no está disponible.');
    const [origen, destino] = dto.invertida ? [ruta.destino, ruta.origen] : [ruta.origen, ruta.destino];

    const volumenM3 = Math.round(dto.largoM * dto.anchoM * dto.altoM * dto.cantidad * 100) / 100;

    const [vehiculos, tarifas] = await Promise.all([
      this.vehiculoRepo.find({ where: { activo: true }, order: { orden: 'ASC' } }),
      this.tarifaRepo.find({ where: { rutaId: ruta.id } }),
    ]);
    const tarifaPorVehiculo = new Map(tarifas.map((t) => [t.vehiculoId.toUpperCase(), num(t.valorBase)]));

    const disponibles = vehiculos
      .map((v) => ({ v, valorBase: tarifaPorVehiculo.get(v.id.toUpperCase()) }))
      .filter((c) => c.valorBase != null && c.valorBase > 0);

    if (dto.cantidad > MAX_UNIDADES) {
      return {
        ok: false, ruta, origen, destino, volumenM3, mensaje: MENSAJE_EXCEDE,
        detalle: `La carga tiene ${dto.cantidad.toLocaleString('es-CO')} unidades (más de ${MAX_UNIDADES.toLocaleString('es-CO')}).`,
        sugerencia: 'Para volúmenes así armamos un plan de transporte a la medida. Escríbenos por WhatsApp.',
      };
    }

    const aptos = disponibles.filter((c) => this.cabe(c.v, dto, volumenM3));
    if (!aptos.length) {
      return {
        ok: false, ruta, origen, destino, volumenM3, mensaje: MENSAJE_EXCEDE,
        ...this.motivoNoCabe(disponibles.map((c) => c.v), dto, volumenM3),
      };
    }

    // Entre los que cumplen, el más económico (a igual precio, el más pequeño).
    aptos.sort((a, b) => a.valorBase - b.valorBase || a.v.orden - b.v.orden);
    const elegido = aptos[0];

    const servicios = await this.serviciosElegidos(dto.servicioIds);
    const margenPct = Math.round(this.margen * 10000) / 100;
    const valorTransporte = Math.round(elegido.valorBase * (1 + this.margen));
    const totalServicios = servicios.reduce((s, x) => s + x.precio, 0);

    return {
      ok: true,
      ruta,
      origen,
      destino,
      vehiculo: elegido.v,
      volumenM3,
      valorBase: elegido.valorBase,
      margenPct,
      valorTransporte,
      servicios,
      totalServicios,
      total: valorTransporte + totalServicios,
    };
  }

  /**
   * Espacio interno efectivo del vehículo. Una medida que no esté configurada nunca significa
   * "sin límite": se usa el máximo legal de carga en Colombia, y si falta el volumen máximo se
   * deriva de largo × ancho × alto.
   */
  private espacio(v: LogisticaVehiculo) {
    const L = num(v.largoM) ?? LIMITE_VIAL.largoM;
    const A = num(v.anchoM) ?? LIMITE_VIAL.anchoM;
    const H = num(v.altoM) ?? LIMITE_VIAL.altoM;
    const volMax = num(v.volumenMaxM3) ?? Math.round(L * A * H * 100) / 100;
    return { L, A, H, volMax, pesoMax: num(v.pesoMaxKg) };
  }

  /** Una unidad (pieza) entra en el vehículo, girándola solo sobre el piso (el alto se respeta). */
  private piezaCabe(v: LogisticaVehiculo, dto: CotizarDto): boolean {
    const { L, A, H } = this.espacio(v);
    if (dto.altoM > H) return false;
    return (dto.largoM <= L && dto.anchoM <= A) || (dto.anchoM <= L && dto.largoM <= A);
  }

  /** Toda la carga va en un solo viaje de este vehículo: peso, volumen total y cada pieza. */
  private cabe(v: LogisticaVehiculo, dto: CotizarDto, volumenM3: number): boolean {
    const { pesoMax, volMax } = this.espacio(v);
    return dto.pesoKg <= pesoMax && volumenM3 <= volMax && this.piezaCabe(v, dto);
  }

  /**
   * Explica por qué la carga no cabe en un solo vehículo y sugiere cómo se podría mover,
   * para que el equipo la cotice a mano por WhatsApp (p. ej. repartida en mula + turbo).
   */
  private motivoNoCabe(
    vehiculos: LogisticaVehiculo[],
    dto: CotizarDto,
    volumenM3: number,
  ): { detalle: string; sugerencia: string } {
    const kg = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`;
    const m = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} m`;
    const m3 = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} m³`;

    if (!vehiculos.length) {
      return {
        detalle: 'Por ahora no tenemos vehículos con tarifa publicada para este destino.',
        sugerencia: 'Escríbenos y te cotizamos el transporte directamente.',
      };
    }

    const mayor = [...vehiculos].sort((a, b) => num(b.pesoMaxKg) - num(a.pesoMaxKg))[0];
    const esp = this.espacio(mayor);
    const pesoPieza = dto.pesoKg / dto.cantidad;

    // Una sola pieza no entra en ningún vehículo: carga extradimensionada.
    if (!vehiculos.some((v) => this.piezaCabe(v, dto))) {
      const largoMax = Math.max(...vehiculos.map((v) => this.espacio(v).L));
      const anchoMax = Math.max(...vehiculos.map((v) => this.espacio(v).A));
      const altoMax = Math.max(...vehiculos.map((v) => this.espacio(v).H));
      const excesos = [
        Math.max(dto.largoM, dto.anchoM) > largoMax && `largo ${m(Math.max(dto.largoM, dto.anchoM))} (máx. ${m(largoMax)})`,
        Math.min(dto.largoM, dto.anchoM) > anchoMax && `ancho ${m(Math.min(dto.largoM, dto.anchoM))} (máx. ${m(anchoMax)})`,
        dto.altoM > altoMax && `alto ${m(dto.altoM)} (máx. ${m(altoMax)})`,
      ].filter(Boolean);
      return {
        detalle: `Cada unidad supera las medidas de nuestros vehículos: ${excesos.join(', ') || 'no entra en ningún espacio de carga'}.`,
        sugerencia:
          'Es carga extradimensionada: se mueve en vehículo especial (cama baja o extensible) y puede requerir permisos. La cotizamos contigo por WhatsApp.',
      };
    }

    if (pesoPieza > esp.pesoMax) {
      return {
        detalle: `Cada unidad pesa ${kg(pesoPieza)} y supera la capacidad de nuestro vehículo más grande (${kg(esp.pesoMax)}).`,
        sugerencia: 'Es carga extrapesada: requiere un vehículo especial. La cotizamos contigo por WhatsApp.',
      };
    }

    // Cada pieza cabe, pero toda la carga no va en un solo viaje: se puede repartir.
    const porPeso = Math.ceil(dto.pesoKg / esp.pesoMax);
    const porVolumen = Math.ceil(volumenM3 / esp.volMax);
    const viajes = Math.max(porPeso, porVolumen, 2);
    const detalle =
      dto.pesoKg > esp.pesoMax
        ? `El peso total (${kg(dto.pesoKg)}) supera la capacidad de un solo vehículo (máx. ${kg(esp.pesoMax)}, ${mayor.nombre}).`
        : volumenM3 > esp.volMax
          ? `El volumen total (${m3(volumenM3)}) supera el de un solo vehículo (máx. ${m3(esp.volMax)}, ${mayor.nombre}).`
          : 'Ningún vehículo soporta a la vez el peso, el volumen y las medidas de esta carga en un solo viaje.';
    return {
      detalle,
      sugerencia:
        viajes > 20
          ? 'Por su tamaño es un proyecto de transporte: lo planeamos contigo por WhatsApp.'
          : `Se puede repartir en varios vehículos (unos ${viajes} viajes en ${mayor.nombre}, o una combinación como mula + turbo). Te armamos la mejor combinación por WhatsApp.`,
    };
  }

  private async serviciosElegidos(ids?: string[]): Promise<ServicioElegido[]> {
    const unicos = [...new Set(ids || [])];
    if (!unicos.length) return [];
    const servicios = await this.servicioRepo.find({ where: { id: In(unicos), activo: true } });
    if (servicios.length !== unicos.length) {
      throw new BadRequestException('Uno de los servicios adicionales ya no está disponible. Recarga la página.');
    }
    return servicios.map((s) => ({ id: s.id, nombre: s.nombre, precio: num(s.precio) }));
  }

  // ── Helpers ──

  private numero(id: number): string {
    return `COT-${String(id).padStart(6, '0')}`;
  }

  /**
   * Carga la cotización y valida que quien la pide pueda usarla:
   *  - Generada con sesión → solo esa cuenta (usuario o empresa). Las editoras de logística pueden verla, no pagarla.
   *  - Generada sin sesión → no tiene dueño; el enlace secreto (token) es la única credencial.
   */
  private async cargarPorToken(token: string, cuenta: CuentaLogistica, uso: UsoCotizacion) {
    const cotizacion = await this.cotizacionRepo.findOne({ where: { token } });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada.');
    await this.assertAcceso(cotizacion, cuenta, uso);
    const order = await this.orderRepo.findOne({ where: { id: cotizacion.orderId } });
    if (!order) throw new NotFoundException('Cotización no encontrada.');
    return { cotizacion, order };
  }

  private tieneDueno(c: LogisticaCotizacion) {
    return !!c.empresaId || c.usuarioId != null;
  }

  private esDueno(c: LogisticaCotizacion, cuenta: CuentaLogistica): boolean {
    if (c.empresaId) return !!cuenta.empresaId && c.empresaId.toUpperCase() === cuenta.empresaId.toUpperCase();
    if (c.usuarioId != null) return cuenta.usuarioId != null && Number(c.usuarioId) === Number(cuenta.usuarioId);
    return true;
  }

  private async assertAcceso(c: LogisticaCotizacion, cuenta: CuentaLogistica, uso: UsoCotizacion) {
    if (this.esDueno(c, cuenta)) return;
    if (uso === 'ver' && cuenta.empresaId && (await this.esEditor(cuenta.empresaId))) return;

    const sinSesion = !cuenta.empresaId && cuenta.usuarioId == null;
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      code: sinSesion ? 'REQUIERE_SESION' : 'OTRA_CUENTA',
      message: sinSesion
        ? 'Esta cotización está asociada a una cuenta. Inicia sesión con esa cuenta para verla y pagarla.'
        : uso === 'pagar'
          ? 'Solo la cuenta que generó esta cotización puede pagarla.'
          : 'Esta cotización pertenece a otra cuenta. Inicia sesión con la cuenta que la generó.',
    });
  }

  private datosPago(order: Order, token: string) {
    const amountInCents = Math.round(Number(order.subtotal) * 100);
    return {
      reference: order.reference,
      amountInCents,
      currency: order.moneda,
      publicKey: this.wompi.publicKey,
      signature: this.wompi.buildIntegritySignature(order.reference, amountInCents, order.moneda),
      environment: this.wompi.environment,
      redirectUrl: `${this.config.get('FRONTEND_URL')}/tienda/logistica/cotizacion/${token}`,
    };
  }

  private cotizacionPublica(c: LogisticaCotizacion, order: Order) {
    return {
      numero: this.numero(c.id),
      token: c.token,
      createdAt: c.createdAt,
      vigenteHasta: c.vigenteHasta,
      vencida: new Date(c.vigenteHasta) < new Date(),
      origen: c.origen,
      destino: c.destino,
      puntoRecogida: c.puntoRecogida,
      puntoEntrega: c.puntoEntrega,
      producto: c.producto,
      descripcion: c.descripcion,
      tipoMercancia: c.tipoMercancia,
      pesoKg: num(c.pesoKg),
      largoM: num(c.largoM),
      anchoM: num(c.anchoM),
      altoM: num(c.altoM),
      cantidad: c.cantidad,
      volumenM3: num(c.volumenM3),
      comentarios: c.comentarios,
      vehiculo: { codigo: c.vehiculoCodigo, nombre: c.vehiculoNombre },
      valorTransporte: num(c.valorTransporte),
      servicios: c.serviciosJson ? JSON.parse(c.serviciosJson) : [],
      totalServicios: num(c.totalServicios),
      total: num(c.total),
      moneda: c.moneda,
      comprador: {
        tipoDocumento: c.compradorTipoDocumento,
        documento: c.compradorDocumento,
        nombre: c.compradorNombre,
        email: c.compradorEmail,
        telefono: c.compradorTelefono,
        direccion: c.compradorDireccion,
        ciudad: c.compradorCiudad,
      },
      pago: {
        estado: order.estado,
        metodo: order.wompiMetodoPago,
        fecha: order.fechaPago,
      },
    };
  }

  private vehiculoPublico(v: LogisticaVehiculo) {
    return {
      codigo: v.codigo,
      nombre: v.nombre,
      pesoMaxKg: num(v.pesoMaxKg),
      volumenMaxM3: num(v.volumenMaxM3),
      largoM: num(v.largoM),
      anchoM: num(v.anchoM),
      altoM: num(v.altoM),
      tipoCarroceria: v.tipoCarroceria,
      imagenUrl: v.imagenUrl,
    };
  }

  private vehiculoAdmin(v: LogisticaVehiculo) {
    return {
      ...v,
      pesoMinKg: num(v.pesoMinKg),
      pesoMaxKg: num(v.pesoMaxKg),
      volumenMinM3: num(v.volumenMinM3),
      volumenMaxM3: num(v.volumenMaxM3),
      largoM: num(v.largoM),
      anchoM: num(v.anchoM),
      altoM: num(v.altoM),
    };
  }
}
