import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('solicitudes_maquinaria')
export class SolicitudMaquinaria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa: string;

  @Column()
  nit: string;

  @Column()
  contacto: string;

  @Column()
  telefono: string;

  @Column()
  correo: string;

  @Column('text')
  maquinaria: string;

  @Column({ type: 'int' })
  unidades: number;

  @Column({ default: 'pendiente' })
  estado: string;

  @CreateDateColumn()
  createdAt: Date;
}
