import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorEntity } from './entities/sector.entity';
import { ProductSector } from './entities/product-sector.entity';
import { EmpresaSector } from './entities/empresa-sector.entity';
import { AssignSectoresDto } from './dto/assign-sector.dto';

@Injectable()
export class SectoresService {
  constructor(
    @InjectRepository(SectorEntity)
    private readonly sectorRepo: Repository<SectorEntity>,

    @InjectRepository(ProductSector)
    private readonly productSectorRepo: Repository<ProductSector>,

    @InjectRepository(EmpresaSector)
    private readonly empresaSectorRepo: Repository<EmpresaSector>,
  ) {}

  findAll() {
    return this.sectorRepo.find({
      where: { activo: true },
      order: { orden: 'ASC' },
    });
  }

  findBySlug(slug: string) {
    return this.sectorRepo.findOne({ where: { slug, activo: true } });
  }

  async getSectoresByProducto(productId: string) {
    return this.productSectorRepo.find({
      where: { productId },
      relations: ['sector'],
    });
  }

  async assignSectoresProducto(productId: string, dto: AssignSectoresDto) {

    for (const sectorId of dto.sectorIds) {
      const existe = await this.sectorRepo.findOne({ where: { id: sectorId } });
      if (!existe) throw new NotFoundException(`Sector ${sectorId} no encontrado`);
    }

    await this.productSectorRepo.delete({ productId });

    const nuevas = dto.sectorIds.map(sectorId =>
      this.productSectorRepo.create({ productId, sectorId }),
    );
    return this.productSectorRepo.save(nuevas);
  }

  async removeSectorProducto(productId: string, sectorId: string) {
    const reg = await this.productSectorRepo.findOne({ where: { productId, sectorId } });
    if (!reg) throw new NotFoundException('Asignación no encontrada');
    return this.productSectorRepo.remove(reg);
  }

  async getSectoresByEmpresa(empresaId: string) {
    return this.empresaSectorRepo.find({
      where: { empresaId },
      relations: ['sector'],
    });
  }

  async assignSectoresEmpresa(empresaId: string, dto: AssignSectoresDto) {
    for (const sectorId of dto.sectorIds) {
      const existe = await this.sectorRepo.findOne({ where: { id: sectorId } });
      if (!existe) throw new NotFoundException(`Sector ${sectorId} no encontrado`);
    }

    await this.empresaSectorRepo.delete({ empresaId });

    const nuevas = dto.sectorIds.map(sectorId =>
      this.empresaSectorRepo.create({ empresaId, sectorId }),
    );
    return this.empresaSectorRepo.save(nuevas);
  }

  async removeSectorEmpresa(empresaId: string, sectorId: string) {
    const reg = await this.empresaSectorRepo.findOne({ where: { empresaId, sectorId } });
    if (!reg) throw new NotFoundException('Asignación no encontrada');
    return this.empresaSectorRepo.remove(reg);
  }
}