import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

/**
 * Empresas autorizadas para editar tarifas, vehículos y servicios de logística desde el dashboard.
 * Se administra directamente en la base de datos (INSERT con el empresaId).
 */
@Entity('logistica_editores')
export class LogisticaEditor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uniqueidentifier' })
  empresaId: string;

  @Column({ nullable: true, length: 200 })
  nota: string;

  @CreateDateColumn()
  createdAt: Date;
}
