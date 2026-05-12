import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { CategoryAttributeDefinition } from '../../categories/entities/category-attribute-definition.entity';

@Entity('product_attribute_values')
export class ProductAttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, p => p.atributos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @ManyToOne(() => CategoryAttributeDefinition)
  @JoinColumn({ name: 'atributoId' })
  atributo: CategoryAttributeDefinition;

  @Column()
  atributoId: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  valor: string;
}