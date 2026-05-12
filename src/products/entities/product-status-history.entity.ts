import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductStatus } from '../../common/enums/product-status.enum';

@Entity('product_status_history')
export class ProductStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, p => p.historialEstados, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column({ type: 'varchar', length: 20 })
  estadoAnterior: ProductStatus;

  @Column({ type: 'varchar', length: 20 })
  estadoNuevo: ProductStatus;

  @Column({ nullable: true })
  cambiadoPor: string;

  @Column({ nullable: true, length: 500 })
  motivo: string;

  @CreateDateColumn()
  createdAt: Date;
}