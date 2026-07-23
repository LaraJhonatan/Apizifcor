import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { EmpresaEntity } from './empresa.entity';

@Entity('cuentas_empresa')
export class CuentaEmpresaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => EmpresaEntity, (empresa) => empresa.cuenta, { eager: true })
  @JoinColumn()
  empresa: EmpresaEntity;

  @Column({ length: 300 })
  passwordHash: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  ultimoLogin: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
