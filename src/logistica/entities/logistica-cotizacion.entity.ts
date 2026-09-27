import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

/**
 * Cotización de transporte confirmada por un cliente. El id es consecutivo y sirve como
 * número del documento (COT-000001). Guarda una foto de todo lo cotizado (precios, vehículo,
 * datos fiscales del comprador) para que el documento no cambie si luego se editan tarifas,
 * y para poder emitir factura electrónica más adelante con los mismos datos.
 * El pago vive en la tabla `orders` (origen = 'logistica'), enlazada por orderId.
 */
@Entity('logistica_cotizaciones')
export class LogisticaCotizacion {
  @PrimaryGeneratedColumn()
  id: number;

  /** Token público (no adivinable) para ver la cotización y pagar sin iniciar sesión. */
  @Index({ unique: true })
  @Column({ length: 36 })
  token: string;

  @Index()
  @Column({ type: 'uniqueidentifier', nullable: true })
  orderId: string;

  // ── Ruta ──
  @Column({ type: 'uniqueidentifier' })
  rutaId: string;

  @Column({ length: 100 })
  origen: string;

  @Column({ length: 100 })
  destino: string;

  @Column({ nullable: true, length: 300 })
  puntoRecogida: string;

  @Column({ nullable: true, length: 300 })
  puntoEntrega: string;

  // ── Carga ──
  @Column({ length: 200 })
  producto: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  descripcion: string;

  @Column({ nullable: true, length: 100 })
  tipoMercancia: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pesoKg: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  largoM: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  anchoM: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  altoM: number;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  volumenM3: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  comentarios: string;

  // ── Vehículo y precio (foto al momento de cotizar) ──
  @Column({ type: 'uniqueidentifier' })
  vehiculoId: string;

  @Column({ length: 10 })
  vehiculoCodigo: string;

  @Column({ length: 100 })
  vehiculoNombre: string;

  /** Costo del Excel. Interno: no se muestra al cliente. */
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  valorBase: number;

  /** Margen aplicado, en porcentaje (30 = 30 %). Interno. */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  margenPct: number;

  /** Valor del transporte que ve el cliente (valorBase + margen). */
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  valorTransporte: number;

  /** JSON: [{ id, nombre, precio }] de los servicios adicionales elegidos. */
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  serviciosJson: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalServicios: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total: number;

  @Column({ length: 10, default: 'COP' })
  moneda: string;

  @Column({ type: 'datetime2' })
  vigenteHasta: Date;

  // ── Comprador (datos fiscales, listos para factura electrónica) ──
  /** NIT | CC | CE | PAS */
  @Column({ length: 10 })
  compradorTipoDocumento: string;

  @Column({ length: 40 })
  compradorDocumento: string;

  /** Razón social o nombre completo. */
  @Column({ length: 200 })
  compradorNombre: string;

  @Column({ length: 200 })
  compradorEmail: string;

  @Column({ length: 30 })
  compradorTelefono: string;

  @Column({ length: 300 })
  compradorDireccion: string;

  @Column({ length: 100 })
  compradorCiudad: string;

  @CreateDateColumn()
  createdAt: Date;
}
