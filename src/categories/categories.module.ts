import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoryAttributeDefinition } from './entities/category-attribute-definition.entity';
import { CategoryAttributeOption } from './entities/category-attribute-option.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    Category,
    CategoryAttributeDefinition,
    CategoryAttributeOption,
  ])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}