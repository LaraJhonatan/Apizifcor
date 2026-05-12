/**
 * FirebaseStorageService
 * ─────────────────────────────────────────────────────────────────────────────
 * Sube el PDF del RUT a Firebase Storage y devuelve la URL de descarga segura.
 *
 * Configuración necesaria en .env:
 *   FIREBASE_PROJECT_ID=
 *   FIREBASE_CLIENT_EMAIL=
 *   FIREBASE_PRIVATE_KEY=       (con \n reales)
 *   FIREBASE_STORAGE_BUCKET=    (ej: mi-proyecto.appspot.com)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

@Injectable()
export class FirebaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private bucket: ReturnType<typeof getStorage>['bucket'] extends (...args: any[]) => infer R ? R : any;

  constructor(private readonly config: ConfigService) {}

onModuleInit() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.config
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
        storageBucket: this.config.get<string>('FIREBASE_STORAGE_BUCKET'),
      });
    }
    this.bucket = admin.storage().bucket() as any;
    this.logger.log('Firebase Storage inicializado correctamente');
  } catch (err) {
    this.logger.warn('Firebase no disponible (credenciales inválidas): ' + err.message);
  }
}

  /**
   * Sube el PDF del RUT a Firebase Storage bajo la ruta:
   *   ruts/{nit}/{timestamp}_{filename}
   *
   * Devuelve la URL de descarga firmada (válida por 10 años, ajustable).
   */
  async subirRut(
    buffer: Buffer,
    nit: string,
    filename: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const extension = filename.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
    const rutaFirebase = `ruts/${nit}/${timestamp}_${filename}${extension}`;

    const file = this.bucket.file(rutaFirebase);

    await file.save(buffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          nit,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // URL firmada válida por 10 años (para uso interno)
    const expiracion = new Date();
    expiracion.setFullYear(expiracion.getFullYear() + 10);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: expiracion,
    });

    this.logger.debug(`RUT subido: ${rutaFirebase}`);
    return url;
  }

  /**
   * Elimina el RUT de un NIT del Storage (útil si el usuario re-sube el RUT).
   */
  async eliminarRutsAnteriores(nit: string): Promise<void> {
    try {
      const [files] = await this.bucket.getFiles({ prefix: `ruts/${nit}/` });
      await Promise.all(files.map((f) => f.delete()));
      this.logger.debug(`RUTs anteriores eliminados para NIT: ${nit}`);
    } catch (err) {
      this.logger.warn(`No se pudieron eliminar RUTs anteriores: ${err.message}`);
    }
  }
}
