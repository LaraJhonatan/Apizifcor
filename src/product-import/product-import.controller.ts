import {
  Controller, Post, UploadedFile, UseInterceptors, UseGuards,
  Req, Body, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductImportService } from './product-import.service';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { ProductsService } from '../products/products.service';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products/import')
export class ProductImportController {
  constructor(
    private readonly svc: ProductImportService,
    private readonly productsSvc: ProductsService,
  ) {}

  @Post('analizar')
  @ApiOperation({ summary: 'Lee un .docx/.pdf y devuelve los productos detectados — NO los guarda' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_SIZE },
  }))
  analizar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No llegó ningún archivo.');
    return this.svc.analizar(file);
  }

  @Post('confirmar')
  @ApiOperation({ summary: 'Crea en lote los productos revisados por el vendedor, siempre como borrador' })
  async confirmar(@Body() dto: ConfirmImportDto, @Req() req) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('Solo una cuenta de empresa puede importar productos.');
    }

    const creados: { id: string; nombre: string }[] = [];
    const errores: { nombre: string; motivo: string }[] = [];

    for (const p of dto.productos) {
      try {
        const producto = await this.productsSvc.create(
          {
            ...p,
            empresaId,
            estado: 'draft',
            pagableEnLinea: p.pagableEnLinea ?? true,
          } as never,
          req.user?.cuentaId,
        );
        creados.push({ id: producto.id, nombre: producto.nombre });
      } catch (e) {
        errores.push({ nombre: p.nombre, motivo: e?.message || 'Error desconocido' });
      }
    }

    return { creados, errores, totalCreados: creados.length, totalErrores: errores.length };
  }
}
