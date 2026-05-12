import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('otps')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  nit: string;

  /** Hash bcrypt del código de 6 dígitos */
  @Column({ length: 300 })
  codigoHash: string;

  /** Fecha de expiración del OTP */
  @Column()
  expiraEn: Date;

  /** true = ya fue utilizado o fue invalidado */
  @Column({ default: false })
  usado: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
