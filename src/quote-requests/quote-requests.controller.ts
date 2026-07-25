import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Request, ForbiddenException, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';

@ApiTags('Solicitudes de cotización')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quote-requests')
export class QuoteRequestsController {
  constructor(private readonly svc: QuoteRequestsService) {}

  private getUsuarioId(req: any): number {
    const user = req.user;
    if (!user || user.tipo !== 'usuario' || !user.usuarioId) {
      throw new ForbiddenException('Solo disponible para usuarios.');
    }
    return Number(user.usuarioId);
  }

  private getEmpresaId(req: any): string {
    const user = req.user;
    if (!user || user.tipo !== 'empresa' || !user.empresaId) {
      throw new ForbiddenException('Solo disponible para empresas.');
    }
    return user.empresaId;
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateQuoteRequestDto) {
    return this.svc.create(this.getUsuarioId(req), dto);
  }

  @Get('mine')
  findMine(@Request() req: any) {
    return this.svc.findMine(this.getUsuarioId(req));
  }

  @Get('empresa')
  findForEmpresa(@Request() req: any) {
    return this.svc.findForEmpresa(this.getEmpresaId(req));
  }

  @Patch(':id/atendida')
  marcarAtendida(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.marcarAtendida(id, this.getEmpresaId(req));
  }
}
