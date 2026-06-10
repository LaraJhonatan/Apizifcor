// src/sitemap/sitemap.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { EmpresaEntity } from '../auth/entities/empresa.entity';
import { SectorEntity } from '../sectores/entities/sector.entity';

const SITE_URL = 'https://www.zifcor.com';

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(EmpresaEntity)
    private readonly empresaRepo: Repository<EmpresaEntity>,
    @InjectRepository(SectorEntity)
    private readonly sectorRepo: Repository<SectorEntity>,
  ) {}

  // Debe producir el mismo resultado que utils/slugify.js del frontend.
  private slugify(text: string): string {
    return (text || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private escapeXml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private urlEntry(loc: string, lastmod?: Date | null, priority = '0.7'): string {
    const lastmodTag = lastmod
      ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>`
      : '';
    return `<url><loc>${this.escapeXml(loc)}</loc>${lastmodTag}<changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  }

  async generate(): Promise<string> {
    const urls: string[] = [];
    // Set para deduplicar URLs (defensa contra duplicados en la DB)
    const seenUrls = new Set<string>();

    const pushUrl = (loc: string, lastmod?: Date | null, priority = '0.7') => {
      if (seenUrls.has(loc)) return;
      seenUrls.add(loc);
      urls.push(this.urlEntry(loc, lastmod, priority));
    };

    // Páginas estáticas
    pushUrl(`${SITE_URL}/`, null, '1.0');
    pushUrl(`${SITE_URL}/tienda`, null, '0.9');

    // SECTORES — mapa id -> slug para resolver el sector de cada empresa por su sectorId.
    const sectorById = new Map<string, string>();
    try {
      const sectores = await this.sectorRepo.find();
      this.logger.log(`Sectores encontrados: ${sectores.length}`);
      for (const s of sectores) {
        const sAny = s as any;
        if (sAny.slug) {
          sectorById.set(String(sAny.id), sAny.slug);
          pushUrl(`${SITE_URL}/tienda/${sAny.slug}`, null, '0.8');
        }
      }
    } catch (err: any) {
      this.logger.error('Error cargando sectores:', err.message);
    }

    // EMPRESAS — mapa id -> { slug, sectorSlug } para resolver al cargar productos.
    const empresaInfo = new Map<string, { slug: string; sectorSlug: string }>();
    try {
      const empresas = await this.empresaRepo.find({ relations: ['profile'] });
      this.logger.log(`Empresas encontradas: ${empresas.length}`);

      for (const emp of empresas) {
        const empAny = emp as any;
        const nombre = empAny.profile?.nombreComercial || empAny.razonSocial;
        if (!nombre) continue;
        const empresaSlug = this.slugify(nombre);
        const sectorSlug = sectorById.get(String(empAny.sectorId)) || '';
        empresaInfo.set(String(empAny.id), { slug: empresaSlug, sectorSlug });

        // URL de la tienda de empresa (solo si sabemos el sector)
        if (sectorSlug) {
          pushUrl(`${SITE_URL}/tienda/${sectorSlug}/${empresaSlug}`, null, '0.8');
        }
      }
    } catch (err: any) {
      this.logger.error('Error cargando empresas:', err.message);
    }

    // PRODUCTOS
    try {
      const productos = await this.productRepo.find({
        relations: ['empresa'],
      });
      this.logger.log(`Productos encontrados: ${productos.length}`);

      let descartadosSinEmpresa = 0;
      let descartadosEliminados = 0;
      let descartadosSinSector = 0;
      let agregados = 0;

      for (const p of productos) {
        const pAny = p as any;

        // Descarta solo si EXPLÍCITAMENTE está marcado como eliminado
        if (pAny.eliminado === true || pAny.eliminado === 1) {
          descartadosEliminados++;
          continue;
        }

        if (!pAny.empresa) {
          descartadosSinEmpresa++;
          continue;
        }

        const info = empresaInfo.get(String(pAny.empresa.id));
        if (!info || !info.sectorSlug) {
          descartadosSinSector++;
          continue;
        }

        const productoSlug = pAny.slug || this.slugify(pAny.nombre);
        if (!productoSlug) continue;

        const lastmod = pAny.updatedAt || pAny.createdAt || null;

        pushUrl(
          `${SITE_URL}/tienda/${info.sectorSlug}/${info.slug}/producto/${productoSlug}`,
          lastmod,
          '0.7',
        );
        agregados++;
      }

      this.logger.log(
        `Productos → agregados: ${agregados}, sin empresa: ${descartadosSinEmpresa}, eliminados: ${descartadosEliminados}, sin sector: ${descartadosSinSector}`,
      );
    } catch (err: any) {
      this.logger.error('Error cargando productos:', err.message);
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
    ].join('\n');
  }
}