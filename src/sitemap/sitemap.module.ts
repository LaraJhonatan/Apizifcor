import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';
import { Product } from '../products/entities/product.entity';
import { EmpresaEntity } from '../auth/entities/empresa.entity';
import { SectorEntity } from '../sectores/entities/sector.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, EmpresaEntity, SectorEntity])],
  controllers: [SitemapController],
  providers: [SitemapService],
})
export class SitemapModule {}