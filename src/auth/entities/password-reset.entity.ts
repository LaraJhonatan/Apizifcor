import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('password_resets')
export class PasswordResetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  empresaId: string;

  @Column({ length: 300 })
  tokenHash: string;

  @Column()
  expiraEn: Date;

  @Column({ default: false })
  usado: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
