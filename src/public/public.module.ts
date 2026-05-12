import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorEntity } from '../sectores/entities/sector.entity';
import { EmpresaEntity } from '../auth/entities/empresa.entity';
import { Product } from '../products/entities/product.entity';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SectorEntity, EmpresaEntity, Product])],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}