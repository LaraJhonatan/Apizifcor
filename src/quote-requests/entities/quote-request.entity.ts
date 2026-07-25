import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { QuoteRequestFile } from './quote-request-file.entity';
import { QuoteRequestStatus } from '../../common/enums/quote-request-status.enum';

@Entity('quote_requests')
export class QuoteRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: string;

  /** Denormalizado (sin FK) para que el listado del dashboard siga funcionando
   * aunque el producto se elimine — misma convención que usuarioId. */
  @Column({ type: 'uniqueidentifier' })
  empresaId: string;

  @Column()
  usuarioId: number;

  @Column({ length: 300 })
  productoNombre: string;

  @Column({ nullable: true, length: 400 })
  productoSlug: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  mensaje: string;

  @Column({ type: 'varchar', length: 20, default: QuoteRequestStatus.PENDING })
  estado: QuoteRequestStatus;

  @OneToMany(() => QuoteRequestFile, (f) => f.quoteRequest, { cascade: true })
  archivos: QuoteRequestFile[];

  @CreateDateColumn()
  createdAt: Date;
}
