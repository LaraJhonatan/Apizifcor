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

  @Column({ length: 300 })
  codigoHash: string;

  @Column()
  expiraEn: Date;

  @Column({ default: false })
  usado: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
