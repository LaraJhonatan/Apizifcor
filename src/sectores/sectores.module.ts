import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorEntity } from './entities/sector.entity';
import { SectoresService } from './sectores.service';
import { SectoresController } from './sectores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SectorEntity])],
  controllers: [SectoresController],
  providers: [SectoresService],
  exports: [SectoresService],
})
export class SectoresModule {}