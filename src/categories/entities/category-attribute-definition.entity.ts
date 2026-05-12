import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { CategoryAttributeOption } from './category-attribute-option.entity';
import { AttributeType } from '../../common/enums/attribute-type.enum'

@Entity('category_attribute_definitions')
export class CategoryAttributeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Category, c => c.atributos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  clave: string;

  @Column({ type: 'varchar', length: 50 })
  tipo: AttributeType;

  @Column({ nullable: true, length: 50 })
  unidad: string;

  @Column({ default: false })
  requerido: boolean;

  @Column({ default: false })
  usarEnVariante: boolean;

  @Column({ default: false })
  filtrable: boolean;

  @Column({ default: 0 })
  orden: number;

  @OneToMany(() => CategoryAttributeOption, o => o.atributo)
  opciones: CategoryAttributeOption[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}