import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductAttributeValue } from './entities/product-attribute-value.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantAttributeValue } from './entities/product-variant-attribute-value.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductStatusHistory } from './entities/product-status-history.entity';
import { ProductSector } from '../sectores/entities/product-sector.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    Product,
    ProductAttributeValue,
    ProductVariant,
    ProductVariantAttributeValue,
    ProductImage,
    ProductStatusHistory,
    ProductSector,
  ])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}