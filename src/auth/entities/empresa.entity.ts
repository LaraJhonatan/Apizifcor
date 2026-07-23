import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  OneToOne, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { CuentaEmpresaEntity } from './cuenta-empresa.entity';
import { EmpresaProfileEntity } from './empresa-profile.entity';
import { Product } from '../../products/entities/product.entity';
import { SectorEntity } from '../../sectores/entities/sector.entity';
import { EmpresaSector } from '../../sectores/entities/empresa-sector.entity';

@Entity('empresas')
export class EmpresaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  nit: string;

  @Column({ nullable: true, length: 5 })
  dv: string;

  @Column({ length: 300 })
  razonSocial: string;

  @Column({ length: 50 })
  estado: string;

  @Column({ nullable: true, length: 300 })
  actividadEconomicaPrincipal: string;

  @Column({ nullable: true, length: 300 })
  actividadEconomicaSecundaria: string;

  @Column({ nullable: true, length: 100 })
  tipoContribuyente: string;

  @Column({ nullable: true, length: 300 })
  direccion: string;

  @Column({ nullable: true, length: 50 })
  telefono: string;

  @Column({ nullable: true, length: 200 })
  correo: string;

  @Column({ default: false })
  correoVerificado: boolean;

  @Column({ nullable: true, length: 500 })
  rutUrl: string;

  @Column({ default: false })
  rutValidado: boolean;

  @Column({ nullable: true })
  sectorId: string;

  @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectorId' })
  sector: SectorEntity;

  @OneToOne(() => CuentaEmpresaEntity, cuenta => cuenta.empresa)
  cuenta: CuentaEmpresaEntity;

  @OneToOne(() => EmpresaProfileEntity, profile => profile.empresa)
  profile: EmpresaProfileEntity;

  @OneToMany(() => Product, p => p.empresa)
  products: Product[];

  @OneToMany(() => EmpresaSector, es => es.empresa, { cascade: true })
  sectores: EmpresaSector[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}