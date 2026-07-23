import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductAttributeValue } from './entities/product-attribute-value.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantAttributeValue } from './entities/product-variant-attribute-value.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductStatusHistory } from './entities/product-status-history.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ChangeProductStatusDto } from './dto/change-status.dto';
import { slugify, slugifyUnique } from '../common/utils/slugify';
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductAttributeValue)
    private readonly atributoValueRepo: Repository<ProductAttributeValue>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductVariantAttributeValue)
    private readonly variantAttrRepo: Repository<ProductVariantAttributeValue>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(ProductStatusHistory)
    private readonly statusHistoryRepo: Repository<ProductStatusHistory>,
  ) {}
private async generarSlugProducto(nombre: string, excludeId?: string): Promise<string> {
  return slugifyUnique(nombre, async (slug) => {
    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.slug = :slug', { slug })
      .andWhere('p.eliminado = :eliminado', { eliminado: false });
    if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
    const found = await qb.getOne();
    return !!found;
  });
}
async create(dto: CreateProductDto, userId?: string): Promise<Product> {
  const slug = await this.generarSlugProducto(dto.nombre);

  const product = this.productRepo.create({
    empresaId:     dto.empresaId,
    categoryId:    dto.categoryId,
    subcategoryId: dto.subcategoryId,
    nombre:        dto.nombre,
    slug,
    descripcion:   dto.descripcion,
    sku:           dto.sku,
    marca:         dto.marca,
    precioBase:    dto.precioBase,
    moneda:        dto.moneda,
    pagableEnLinea: dto.pagableEnLinea ?? true,
    stock:         dto.stock ?? null,
    estado:        dto.estado,
    createdBy:     userId,
    updatedBy:     userId,
  });

  const saved = await this.productRepo.save(product);

  if (dto.atributos?.length) {
    const values = dto.atributos.map(a =>
      this.atributoValueRepo.create({ productId: saved.id, ...a }),
    );
    await this.atributoValueRepo.save(values);
  }

  if (dto.imagenes?.length) {
    const imgs = dto.imagenes.map(i =>
      this.imageRepo.create({ productId: saved.id, ...i }),
    );
    await this.imageRepo.save(imgs);
  }

  if (dto.variantes?.length) {
    for (const v of dto.variantes) {
      const variant = await this.variantRepo.save(
        this.variantRepo.create({
          productId: saved.id,
          sku:       v.sku,
          precio:    v.precio,
          stock:     v.stock,
        }),
      );
      if (v.atributos?.length) {
        const vAttrs = v.atributos.map(a =>
          this.variantAttrRepo.create({ varianteId: variant.id, ...a }),
        );
        await this.variantAttrRepo.save(vAttrs);
      }
    }
  }

  return this.getById(saved.id);
}

  async findAll(filters: FilterProductsDto & { empresaId?: string }) {
    const {
      page = 1, limit = 20,
      empresaId, categoryId, subcategoryId,
      estado, q, marca,
    } = filters;

    const qb = this.productRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.imagenes', 'imagenes')
      .where('p.eliminado = :eliminado', { eliminado: false });

    if (empresaId) qb.andWhere('p.empresaId = :empresaId', { empresaId });
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (subcategoryId) qb.andWhere('p.subcategoryId = :subcategoryId', { subcategoryId });
    if (estado) qb.andWhere('p.estado = :estado', { estado });
    if (marca) qb.andWhere('p.marca = :marca', { marca });
    if (q) qb.andWhere('(p.nombre LIKE :q OR p.descripcion LIKE :q)', { q: `%${q}%` });

    const [data, total] = await qb
      .skip((+page - 1) * +limit)
      .take(+limit)
      .orderBy('p.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) };
  }

  async getById(id: string, empresaId?: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, eliminado: false },
      relations: [
        'empresa', 'category', 'subcategory',
        'atributos', 'atributos.atributo',
        'imagenes',
        'variantes', 'variantes.atributos', 'variantes.atributos.atributo',
      ],
    });

    if (!product) throw new NotFoundException('Producto no encontrado');

    if (empresaId && product.empresaId !== empresaId) {
      throw new ForbiddenException('No tienes permiso para acceder a este producto');
    }

    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>, empresaId?: string, userId?: string): Promise<Product> {
  const product = await this.getById(id, empresaId);

  const { empresaId: _ignoreEmpresaId, id: _ignoreId, ...safeDto } = dto as Record<string, unknown>;
  void _ignoreEmpresaId;
  void _ignoreId;

  const slug = dto.nombre && dto.nombre !== product.nombre
    ? await this.generarSlugProducto(dto.nombre, id)
    : product.slug;

  await this.productRepo.save({
    ...product,
    ...safeDto,
    slug,
    updatedBy: userId,
    atributos: undefined,
    imagenes:  undefined,
    variantes: undefined,
  });

  if (dto.atributos) {
    await this.atributoValueRepo.delete({ productId: id });
    const values = dto.atributos.map(a =>
      this.atributoValueRepo.create({ productId: id, ...a }),
    );
    await this.atributoValueRepo.save(values);
  }

  if (dto.imagenes) {
    await this.imageRepo.delete({ productId: id });
    const imgs = dto.imagenes.map(i =>
      this.imageRepo.create({ productId: id, ...i }),
    );
    await this.imageRepo.save(imgs);
  }

  if (dto.variantes) {
    const variantesExistentes = await this.variantRepo.find({ where: { productId: id } });
    for (const v of variantesExistentes) {
      await this.variantAttrRepo.delete({ varianteId: v.id });
    }
    await this.variantRepo.delete({ productId: id });
    for (const v of dto.variantes) {
      const savedVariant = await this.variantRepo.save(
        this.variantRepo.create({ productId: id, sku: v.sku, precio: v.precio, stock: v.stock }),
      );
      if (v.atributos?.length) {
        const vAttrs = v.atributos.map(a =>
          this.variantAttrRepo.create({ varianteId: savedVariant.id, atributoId: a.atributoId, valor: a.valor }),
        );
        await this.variantAttrRepo.save(vAttrs);
      }
    }
  }

  return this.getById(id);
}

  async changeStatus(id: string, dto: ChangeProductStatusDto, empresaId?: string, userId?: string): Promise<Product> {

    const product = await this.getById(id, empresaId);

    const history = this.statusHistoryRepo.create({
      productId: id,
      estadoAnterior: product.estado,
      estadoNuevo: dto.estado,
      cambiadoPor: userId,
      motivo: dto.motivo,
    });
    await this.statusHistoryRepo.save(history);
    await this.productRepo.update(id, { estado: dto.estado, updatedBy: userId });
    return this.getById(id);
  }

  async softDelete(id: string, empresaId?: string, userId?: string): Promise<void> {

    await this.getById(id, empresaId);
    await this.productRepo.update(id, { eliminado: true, updatedBy: userId });
  }
}