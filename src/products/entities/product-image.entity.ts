import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, p => p.imagenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column({ length: 1000 })
  url: string;

  @Column({ nullable: true, length: 300 })
  altText: string;

  @Column({ default: false })
  esPrincipal: boolean;

  @Column({ default: 0 })
  orden: number;
}