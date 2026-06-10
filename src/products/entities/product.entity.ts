import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { EmpresaEntity } from '../../auth/entities/empresa.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { ProductStatusHistory } from './product-status-history.entity';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ProductSector } from '../../sectores/entities/product-sector.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmpresaEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresaId' })
  empresa: EmpresaEntity;

  @Column()
  empresaId: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'subcategoryId' })
  subcategory: Category;

  @Column({ nullable: true })
  subcategoryId: string;

  @Column({ length: 300 })
  nombre: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  descripcion: string;

  @Column({ nullable: true, length: 100 })
  sku: string;

  @Column({ nullable: true, length: 100 })
  marca: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  precioBase: number;

  @Column({ nullable: true, length: 20 })
  moneda: string;
@Column({ nullable: true, length: 400 })
slug: string;
  @Column({ type: 'varchar', length: 20, default: ProductStatus.DRAFT })
  estado: ProductStatus;

  @Column({ default: false })
  eliminado: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProductAttributeValue, v => v.product, { cascade: true })
  atributos: ProductAttributeValue[];

  @OneToMany(() => ProductVariant, v => v.product, { cascade: true })
  variantes: ProductVariant[];

  @OneToMany(() => ProductImage, i => i.product, { cascade: true })
  imagenes: ProductImage[];

  @OneToMany(() => ProductStatusHistory, h => h.product)
  historialEstados: ProductStatusHistory[];

  @OneToMany(() => ProductSector, ps => ps.product, { cascade: true })
  sectores: ProductSector[];
}