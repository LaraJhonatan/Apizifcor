import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

/**
 * Valor base (costo, sin margen) de mover una carga por una ruta en un tipo de vehículo.
 * Si no hay fila para (ruta, vehículo), ese vehículo no se ofrece en esa ruta.
 */
@Entity('logistica_tarifas')
@Index(['rutaId', 'vehiculoId'], { unique: true })
export class LogisticaTarifa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uniqueidentifier' })
  rutaId: string;

  @Column({ type: 'uniqueidentifier' })
  vehiculoId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  valorBase: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
