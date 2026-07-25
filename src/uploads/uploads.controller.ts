import {
  Controller, Post, Delete, Param,
  UploadedFile, UseInterceptors, Query, UseGuards,
  BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_DOC_MIMETYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp',
];
const MAX_DOC_SIZE = 15 * 1024 * 1024;

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly svc: UploadsService) {}

  @Post('image')
  @ApiOperation({ summary: 'Subir imagen a Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'productos' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Solo se aceptan imágenes JPG, PNG, WEBP o GIF'), false);
      }
      cb(null, true);
    },
  }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.svc.uploadImage(file, folder ?? 'general');
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar imagen de Cloudinary por publicId' })
  delete(@Param('publicId') publicId: string) {
    return this.svc.deleteImage(publicId);
  }

  @Post('file')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subir archivo (PDF, ZIP, RAR, Excel, Word) a Cloudinary — requiere sesión' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'cotizaciones' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_DOC_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_DOC_MIMETYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Tipo de archivo no permitido. Se aceptan PDF, ZIP, RAR, Excel, Word o imágenes.'), false);
      }
      cb(null, true);
    },
  }))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.svc.uploadFile(file, folder ?? 'general');
  }
}