import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorEntity } from '../sectores/entities/sector.entity';
import { EmpresaEntity } from '../auth/entities/empresa.entity';
import { EmpresaProfileEntity } from '../auth/entities/empresa-profile.entity';
import { Product } from '../products/entities/product.entity';
import { ProductSector } from '../sectores/entities/product-sector.entity';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SectorEntity,
      EmpresaEntity,
      EmpresaProfileEntity,
      Product,
      ProductSector,
    ]),
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}