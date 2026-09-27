import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Ruta con precio fijo (una fila del Excel). Solo de ida: origen → destino. */
@Entity('logistica_rutas')
export class LogisticaRuta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  origen: string;

  @Column({ length: 100 })
  destino: string;

  /** 'nacional' | 'urbano' (urbano = dentro de la ciudad de origen, con varias entregas). */
  @Column({ type: 'varchar', length: 20, default: 'nacional' })
  tipo: string;

  @Column({ type: 'int', default: 1 })
  entregasIncluidas: number;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
