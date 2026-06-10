import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { EmpresaEntity } from '../../auth/entities/empresa.entity';
import { SectorEntity } from './sector.entity';

@Entity('empresa_sectores')
export class EmpresaSector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  empresaId: string;

  @Column()
  sectorId: string;

  @ManyToOne(() => EmpresaEntity, e => e.sectores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresaId' })
  empresa: EmpresaEntity;

  @ManyToOne(() => SectorEntity, s => s.empresaSectores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectorId' })
  sector: SectorEntity;

  @CreateDateColumn()
  createdAt: Date;
}