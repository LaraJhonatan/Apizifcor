import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository,IsNull  } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoryAttributeDefinition } from './entities/category-attribute-definition.entity';
import { CategoryAttributeOption } from './entities/category-attribute-option.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from './dto/update-attribute-definition.dto';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(CategoryAttributeDefinition)
    private readonly atributoRepo: Repository<CategoryAttributeDefinition>,
    @InjectRepository(CategoryAttributeOption)
    private readonly opcionRepo: Repository<CategoryAttributeOption>,
  ) {}

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

async getTree() {
  return this.categoryRepo.find({
    where: { parentId: IsNull(), activo: true },
    relations: ['hijos', 'hijos.atributos'],
    order: { orden: 'ASC' },
  })
}

  async getById(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['atributos', 'atributos.opciones', 'hijos'],
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async getAtributos(categoryId: string): Promise<CategoryAttributeDefinition[]> {
    return this.atributoRepo.find({
      where: { categoryId },
      relations: ['opciones'],
      order: { orden: 'ASC' },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.categoryRepo.update(id, dto);
    return this.getById(id);
  }

  async deactivateCategory(id: string): Promise<void> {
    await this.categoryRepo.update(id, { activo: false });
  }

  async createAtributo(dto: CreateAttributeDefinitionDto): Promise<CategoryAttributeDefinition> {
    const atributo = this.atributoRepo.create(dto);
    return this.atributoRepo.save(atributo);
  }

  async updateAtributo(id: string, dto: UpdateAttributeDefinitionDto): Promise<CategoryAttributeDefinition> {
    await this.atributoRepo.update(id, dto);
    return this.atributoRepo.findOne({ where: { id }, relations: ['opciones'] });
  }

  async createOpcion(dto: CreateAttributeOptionDto): Promise<CategoryAttributeOption> {
    const opcion = this.opcionRepo.create(dto);
    return this.opcionRepo.save(opcion);
  }

  async deleteOpcion(id: string): Promise<void> {
    await this.opcionRepo.delete(id);
  }
}