import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SectoresService } from './sectores.service';

@ApiTags('Sectores')
@Controller('sectores')
export class SectoresController {
  constructor(private readonly svc: SectoresService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.svc.findBySlug(slug);
  }
}