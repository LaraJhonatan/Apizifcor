import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorEntity } from '../sectores/entities/sector.entity';
import { EmpresaEntity } from '../auth/entities/empresa.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(SectorEntity)
    private readonly sectorRepo: Repository<SectorEntity>,
    @InjectRepository(EmpresaEntity)
    private readonly empresaRepo: Repository<EmpresaEntity>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getSectores() {
    const sectores = await this.sectorRepo.find({
      where: { activo: true },
      order: { orden: 'ASC' },
    });

    const result = await Promise.all(
      sectores.map(async (s) => {
        const totalEmpresas = await this.empresaRepo.count({
          where: { sectorId: s.id },
        });
        return { ...s, totalEmpresas };
      }),
    );

    return result;
  }

  async getEmpresasBySector(slug: string) {
    const sector = await this.sectorRepo.findOne({ where: { slug, activo: true } });
    if (!sector) throw new NotFoundException('Sector no encontrado');

    const empresas = await this.empresaRepo.find({
      where: { sectorId: sector.id },
      relations: ['profile'],
    });

    return { sector, empresas };
  }

  async getEmpresa(id: string) {
    const empresa = await this.empresaRepo.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  async getProductosEmpresa(empresaId: string, params: any) {
    const { page = 1, limit = 12, q, estado = 'published' } = params;

    const qb = this.productRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.imagenes', 'imagenes')
      .where('p.empresaId = :empresaId', { empresaId })
      .andWhere('p.estado = :estado', { estado })
      .andWhere('p.eliminado = :eliminado', { eliminado: false });

    if (q) {
      qb.andWhere('(p.nombre LIKE :q OR p.descripcion LIKE :q)', { q: `%${q}%` });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('p.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }
async searchProductos(params: any) {
  const { page = 1, limit = 16, q, estado = 'published' } = params;

  const qb = this.productRepo.createQueryBuilder('p')
    .leftJoinAndSelect('p.category', 'category')
    .leftJoinAndSelect('p.imagenes', 'imagenes')
    .leftJoinAndSelect('p.empresa', 'empresa')
    .leftJoinAndSelect('empresa.profile', 'profile')
    .leftJoin('product_attribute_values', 'attrVal', 'attrVal.productId = p.id')
    .where('p.estado = :estado', { estado })
    .andWhere('p.eliminado = :eliminado', { eliminado: false });

  if (q) {
    const words = q.trim().split(/\s+/).filter((w: string) => w.length >= 2)
    const stems = words.map((w: string) =>
      w.slice(0, Math.max(3, Math.floor(w.length * 0.75)))
    )
    const allTerms: string[] = [...new Set<string>([
      ...words,
      ...stems,
      ...words.map((w: string) => w.toUpperCase()),
      ...words.map((w: string) => w.toLowerCase()),
    ])]

    const conditions = allTerms
      .map((_: string, i: number) =>
        `(p.nombre LIKE :t${i}
          OR p.descripcion LIKE :t${i}
          OR p.marca LIKE :t${i}
          OR p.sku LIKE :t${i}
          OR attrVal.valor LIKE :t${i})`
      )
      .join(' OR ')

    const termParams: Record<string, string> = {}
    allTerms.forEach((t: string, i: number) => {
      termParams[`t${i}`] = `%${t}%`
    })

    qb.andWhere(`(${conditions})`, termParams)
  }

  const [data, total] = await qb
    .distinct(true)
    .skip((+page - 1) * +limit)
    .take(+limit)
    .orderBy('p.createdAt', 'DESC')
    .getManyAndCount();

  return { data, total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) };
}
  async getProducto(id: string) {
    const product = await this.productRepo.findOne({
      where: { id, eliminado: false, estado: 'published' as any },
      relations: [
        'empresa', 'empresa.profile',
        'category',
        'atributos', 'atributos.atributo',
        'imagenes',
        'variantes', 'variantes.atributos', 'variantes.atributos.atributo',
      ],
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }
}