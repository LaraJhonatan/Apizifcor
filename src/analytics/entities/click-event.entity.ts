import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ClickEventTipo {
  PRODUCTO = 'producto',
  EMPRESA = 'empresa',
  BUSQUEDA = 'busqueda',
}

@Entity('click_events')
@Index(['tipo', 'productId', 'createdAt'])
export class ClickEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: ClickEventTipo;

  @Index()
  @Column({ nullable: true })
  productId: string;

  @Index()
  @Column({ nullable: true })
  empresaId: string;

  @Column({ nullable: true, length: 200 })
  termino: string;

  @CreateDateColumn()
  createdAt: Date;
}
