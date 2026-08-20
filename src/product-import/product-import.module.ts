import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { ProductsModule } from '../products/products.module';
import { ProductImportService } from './product-import.service';
import { ProductImportController } from './product-import.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), ProductsModule],
  controllers: [ProductImportController],
  providers: [ProductImportService],
})
export class ProductImportModule {}
