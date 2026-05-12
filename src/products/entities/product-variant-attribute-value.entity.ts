import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { CategoryAttributeDefinition } from '../../categories/entities/category-attribute-definition.entity';

@Entity('product_variant_attribute_values')
export class ProductVariantAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProductVariant, v => v.atributos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'varianteId' })
  variante: ProductVariant;

  @Column()
  varianteId: string;

  @ManyToOne(() => CategoryAttributeDefinition)
  @JoinColumn({ name: 'atributoId' })
  atributo: CategoryAttributeDefinition;

  @Column()
  atributoId: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  valor: string;
}