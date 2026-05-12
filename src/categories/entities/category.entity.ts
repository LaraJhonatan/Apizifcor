import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { CategoryAttributeDefinition } from './category-attribute-definition.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true, length: 500 })
  descripcion: string;

  @Column({ nullable: true, length: 500 })
  imagenUrl: string;

  @Column({ nullable: true })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Category, c => c.hijos, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @Column({ nullable: true })
  parentId: string;

  @OneToMany(() => Category, c => c.parent)
  hijos: Category[];

  @OneToMany(() => CategoryAttributeDefinition, a => a.category)
  atributos: CategoryAttributeDefinition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}