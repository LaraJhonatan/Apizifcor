import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('usuarios')
export class UsuarioEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 128 })
  googleId: string;

  @Index({ unique: true })
  @Column({ length: 256 })
  email: string;

  @Column({ length: 256 })
  nombreCompleto: string;

  @Column({ length: 1024, nullable: true })
  fotoUrl: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  fechaRegistro: Date;

  @UpdateDateColumn()
  ultimoAcceso: Date;
}