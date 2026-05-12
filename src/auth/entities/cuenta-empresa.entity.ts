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

  // ── Relación con Empresa (1:1) ────────────────────────────────────────────
  @OneToOne(() => EmpresaEntity, (empresa) => empresa.cuenta, { eager: true })
  @JoinColumn()
  empresa: EmpresaEntity;

  // ── Credenciales ──────────────────────────────────────────────────────────
  @Column({ length: 300 })
  passwordHash: string;

  // ── Estado ────────────────────────────────────────────────────────────────
  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  ultimoLogin: Date;

  // ── Timestamps ────────────────────────────────────────────────────────────
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
