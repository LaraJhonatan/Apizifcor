import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderOrigin } from '../../common/enums/order-origin.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, default: OrderOrigin.WOMPI })
  origen: OrderOrigin;

  /** Solo para órdenes manuales: la empresa que la creó desde el dashboard. */
  @Index()
  @Column({ type: 'uniqueidentifier', nullable: true })
  empresaId: string;

  /** Nulo cuando el comprador no tiene cuenta ZIFCOR (venta manual a un tercero). */
  @Index()
  @Column({ type: 'int', nullable: true })
  usuarioId: number;

  /** Datos del comprador para órdenes manuales sin cuenta (o como respaldo siempre). */
  @Column({ nullable: true, length: 200 })
  compradorNombre: string;

  @Column({ nullable: true, length: 40 })
  compradorDocumento: string;

  @Column({ nullable: true, length: 200 })
  compradorEmail: string;

  @Column({ nullable: true, length: 30 })
  compradorTelefono: string;

  @Index({ unique: true })
  @Column({ length: 80 })
  reference: string;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  estado: OrderStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({ length: 10, default: 'COP' })
  moneda: string;

  @Column({ nullable: true, length: 100 })
  wompiTransactionId: string;

  @Column({ nullable: true, length: 50 })
  wompiMetodoPago: string;

  /** Método de pago para órdenes manuales, ej. "Transferencia bancaria". */
  @Column({ nullable: true, length: 50 })
  medioPagoManual: string;

  @Column({ type: 'datetime2', nullable: true })
  fechaPago: Date;

  @Column({ nullable: true, length: 200 })
  envioNombreCompleto: string;

  @Column({ nullable: true, length: 30 })
  envioTelefono: string;

  @Column({ nullable: true, length: 300 })
  envioDireccion: string;

  @Column({ nullable: true, length: 100 })
  envioCiudad: string;

  @Column({ nullable: true, length: 100 })
  envioDepartamento: string;

  @Column({ nullable: true, length: 20 })
  envioCodigoPostal: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  envioNotas: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
