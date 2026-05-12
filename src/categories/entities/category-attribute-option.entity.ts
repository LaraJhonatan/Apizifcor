import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { CategoryAttributeDefinition } from './category-attribute-definition.entity';

@Entity('category_attribute_options')
export class CategoryAttributeOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CategoryAttributeDefinition, a => a.opciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'atributoId' })
  atributo: CategoryAttributeDefinition;

  @Column()
  atributoId: string;

  @Column({ length: 200 })
  label: string;

  @Column({ length: 200 })
  valor: string;

  @Column({ default: 0 })
  orden: number;
}