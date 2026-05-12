import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorEntity } from './entities/sector.entity';

@Injectable()
export class SectoresService {
  constructor(
    @InjectRepository(SectorEntity)
    private readonly sectorRepo: Repository<SectorEntity>,
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
}