import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, p => p.variantes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @Column({ nullable: true, length: 100 })
  sku: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  precio: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => ProductVariantAttributeValue, v => v.variante, { cascade: true })
  atributos: ProductVariantAttributeValue[];
}