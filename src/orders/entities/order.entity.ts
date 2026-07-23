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

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  usuarioId: number;

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

  @Column({ length: 200 })
  envioNombreCompleto: string;

  @Column({ length: 30 })
  envioTelefono: string;

  @Column({ length: 300 })
  envioDireccion: string;

  @Column({ length: 100 })
  envioCiudad: string;

  @Column({ length: 100 })
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
