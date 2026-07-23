import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * Línea de una orden. Guarda una "foto" del producto al momento de comprar
 * (nombre, precio) para que el historial no cambie si luego se edita o
 * elimina el producto.
 */
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Index()
  @Column({ type: 'uniqueidentifier' })
  orderId: string;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uniqueidentifier', nullable: true })
  productId: string;

  @Column({ length: 300 })
  nombre: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;
}
