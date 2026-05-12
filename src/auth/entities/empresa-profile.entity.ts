import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { EmpresaEntity } from './empresa.entity';

@Entity('empresa_profiles')
export class EmpresaProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => EmpresaEntity, e => e.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresaId' })
  empresa: EmpresaEntity;

  @Column()
  empresaId: string;

  @Column({ nullable: true, length: 200 })
  nombreComercial: string;

  @Column({ nullable: true, type: 'nvarchar', length: 'max' })
  descripcion: string;

  @Column({ nullable: true, length: 500 })
  logoUrl: string;

  @Column({ nullable: true, length: 500 })
  bannerUrl: string;

  @Column({ nullable: true, length: 200 })
  sitioWeb: string;

  @Column({ nullable: true, length: 100 })
  ciudad: string;

  @Column({ nullable: true, length: 100 })
  departamento: string;

  @Column({ nullable: true, length: 200 })
  linkedIn: string;

  @Column({ nullable: true, length: 200 })
  instagram: string;

  @Column({ nullable: true, length: 200 })
  facebook: string;

  @Column({ nullable: true, length: 100 })
  whatsapp: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}