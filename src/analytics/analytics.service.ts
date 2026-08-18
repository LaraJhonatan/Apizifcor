import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClickEventEntity, ClickEventTipo } from './entities/click-event.entity';
import { Product } from '../products/entities/product.entity';

const VENTANA_DIAS_TENDENCIA = 30;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ClickEventEntity)
    private readonly clickRepo: Repository<ClickEventEntity>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async registrarClickProducto(productId: string) {
    await this.clickRepo.save(
      this.clickRepo.create({ tipo: ClickEventTipo.PRODUCTO, productId }),
    );
    return { ok: true };
  }

  async registrarClickEmpresa(empresaId: string) {
    await this.clickRepo.save(
      this.clickRepo.create({ tipo: ClickEventTipo.EMPRESA, empresaId }),
    );
    return { ok: true };
  }

  async registrarBusqueda(termino: string) {
    await this.clickRepo.save(
      this.clickRepo.create({ tipo: ClickEventTipo.BUSQUEDA, termino }),
    );
    return { ok: true };
  }

  async getProductosMasClickeados(limit = 15) {
    const desde = new Date();
    desde.setDate(desde.getDate() - VENTANA_DIAS_TENDENCIA);

    const top = await this.clickRepo
      .createQueryBuilder('c')
      .select('c.productId', 'productId')
      .addSelect('COUNT(*)', 'totalClicks')
      .where('c.tipo = :tipo', { tipo: ClickEventTipo.PRODUCTO })
      .andWhere('c.createdAt >= :desde', { desde })
      .groupBy('c.productId')
      .orderBy('totalClicks', 'DESC')
      .limit(limit)
      .getRawMany();

    if (!top.length) return [];

    const ids = top.map((r) => r.productId);
    const productos = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.imagenes', 'pi')
      .leftJoinAndSelect('p.empresa', 'e')
      .leftJoinAndSelect('e.profile', 'ep')
      .where('p.id IN (:...ids)', { ids })
      .andWhere('p.estado = :estado', { estado: 'published' })
      .andWhere('p.eliminado = :eliminado', { eliminado: false })
      .getMany();

    const porId = new Map(productos.map((p) => [p.id, p]));

    return top
      .filter((r) => porId.has(r.productId))
      .map((r, idx) => {
        const p = porId.get(r.productId);
        const imagen = p.imagenes?.find((i) => i.esPrincipal) ?? p.imagenes?.[0] ?? null;
        const perfil = p.empresa?.profile;

        return {
          id: r.productId,
          orden: idx,
          totalClicks: Number(r.totalClicks),
          producto: {
            id: p.id,
            nombre: p.nombre,
            slug: p.slug,
            precioBase: p.precioBase,
            moneda: p.moneda ?? 'COP',
            marca: p.marca,
            imagenUrl: imagen?.url ?? null,
            imagenAlt: imagen?.altText ?? p.nombre,
          },
          empresa: {
            nombreComercial: perfil?.nombreComercial ?? null,
            logoUrl: perfil?.logoUrl ?? null,
            slug: perfil?.slug ?? null,
          },
        };
      });
  }
}
