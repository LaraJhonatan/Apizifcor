import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File, folder = 'general'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `zifux/${folder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      ).end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  async uploadFile(file: Express.Multer.File, folder = 'general'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `zifux/${folder}`,
          resource_type: 'raw',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      ).end(file.buffer);
    });
  }
}