import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Servicio adicional opcional (cargue y descargue, seguro, escolta...). Precio final, sin margen. */
@Entity('logistica_servicios')
export class LogisticaServicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true, length: 500 })
  descripcion: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  precio: number;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
