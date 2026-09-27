import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Tipo de vehículo (T1–T8 del Excel de tarifas). Las medidas son internas, en metros. */
@Entity('logistica_vehiculos')
export class LogisticaVehiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Código corto del Excel: T1, T2, ... */
  @Column({ length: 10 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  pesoMinKg: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pesoMaxKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumenMinM3: number;

  /** Nulo = sin límite de volumen conocido (no se valida). */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumenMaxM3: number;

  /** Nulo = no se valida esa medida. */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  largoM: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  anchoM: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  altoM: number;

  @Column({ nullable: true, length: 100 })
  tipoCarroceria: string;

  @Column({ nullable: true, length: 500 })
  imagenUrl: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
