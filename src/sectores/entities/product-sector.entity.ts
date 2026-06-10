import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { SectorEntity } from './sector.entity';

@Entity('product_sectores')
export class ProductSector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  sectorId: string;

  @ManyToOne(() => Product, p => p.sectores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => SectorEntity, s => s.productSectores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectorId' })
  sector: SectorEntity;

  @CreateDateColumn()
  createdAt: Date;
}
