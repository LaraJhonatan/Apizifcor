import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeccionDestacadoEntity } from './entities/seccion-destacado.entity';

@Injectable()
export class DestacadosService {
  constructor(
    @InjectRepository(SeccionDestacadoEntity)
    private readonly repo: Repository<SeccionDestacadoEntity>,
  ) {}

  async getPorLlave(llave: string) {
    const rows = await this.repo
      .createQueryBuilder('sd')
      .innerJoinAndSelect('sd.product', 'p')
      .leftJoinAndSelect('p.imagenes', 'pi')
      .leftJoinAndSelect('p.empresa', 'e')
      .leftJoinAndSelect('e.profile', 'ep')
      .where('sd.llave = :llave', { llave })
      .andWhere('sd.activo = :activo', { activo: true })
      .andWhere('p.estado = :estado', { estado: 'published' })
      .andWhere('p.eliminado = :eliminado', { eliminado: false })
      .orderBy('sd.orden', 'ASC')
      .getMany();

    return rows.map((sd) => {
      const p = sd.product;
      const imagen = p.imagenes?.find(i => i.esPrincipal) ?? p.imagenes?.[0] ?? null;
      const perfil = p.empresa?.profile;

      return {
        id: sd.id,
        orden: sd.orden,
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

  async getLlaves() {
    const rows = await this.repo
      .createQueryBuilder('sd')
      .select('sd.llave', 'llave')
      .addSelect('COUNT(*)', 'total')
      .where('sd.activo = :activo', { activo: true })
      .groupBy('sd.llave')
      .getRawMany();
    return rows;
  }
}