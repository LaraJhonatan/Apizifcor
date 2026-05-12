import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sectores')
export class SectorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ nullable: true, length: 500 })
  descripcion: string;

  @Column({ nullable: true, length: 500 })
  imagenUrl: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;
}