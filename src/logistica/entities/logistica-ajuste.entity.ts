import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Ajustes editables del módulo de logística (clave → valor), p. ej. las imágenes del banner
 * de inicio y del encabezado del cotizador, para cambiarlas sin volver a publicar el front.
 */
@Entity('logistica_ajustes')
export class LogisticaAjuste {
  @PrimaryColumn({ length: 50 })
  clave: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  valor: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
