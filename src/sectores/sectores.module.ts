import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectoresService } from './sectores.service';
import { SectoresController } from './sectores.controller';
import { SectorEntity } from './entities/sector.entity';
import { ProductSector } from './entities/product-sector.entity';
import { EmpresaSector } from './entities/empresa-sector.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SectorEntity, ProductSector, EmpresaSector]),
  ],
  controllers: [SectoresController],
  providers: [SectoresService],
  exports: [SectoresService],
})
export class SectoresModule {}