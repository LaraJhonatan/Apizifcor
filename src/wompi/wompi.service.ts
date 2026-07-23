import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);

  constructor(private readonly config: ConfigService) {}

  get publicKey(): string {
    return this.config.get<string>('WOMPI_PUBLIC_KEY');
  }

  get privateKey(): string {
    return this.config.get<string>('WOMPI_PRIVATE_KEY');
  }

  private get integritySecret(): string {
    return this.config.get<string>('WOMPI_INTEGRITY_SECRET');
  }

  private get eventsSecret(): string {
    return this.config.get<string>('WOMPI_EVENTS_SECRET');
  }

  /** 'test' (sandbox) o 'prod' — solo informativo para el front. */
  get environment(): string {
    return this.config.get<string>('WOMPI_ENVIRONMENT', 'test');
  }

  /**
   * Firma de integridad que exige el Widget de Wompi para abrir el checkout,
   * evitando que el monto se manipule desde el navegador.
   * Fórmula oficial: sha256(referencia + montoEnCentavos + moneda + secretoIntegridad)
   */
  buildIntegritySignature(reference: string, amountInCents: number, currency = 'COP'): string {
    if (!this.integritySecret) {
      this.logger.warn('WOMPI_INTEGRITY_SECRET no está configurado — el widget rechazará la transacción.');
    }
    const raw = `${reference}${amountInCents}${currency}${this.integritySecret || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Verifica la firma de un evento (webhook) de Wompi.
   * Algoritmo oficial: concatenar los valores de signature.properties (en ese
   * orden, leídos de "data" por ruta con puntos), luego el timestamp, luego el
   * secreto de eventos, y comparar el sha256 resultante contra signature.checksum.
   */
  verifyEventSignature(payload: any): boolean {
    try {
      const properties: string[] = payload?.signature?.properties || [];
      const checksum: string = payload?.signature?.checksum || '';
      const timestamp = payload?.timestamp;

      if (!properties.length || !checksum || timestamp == null || !this.eventsSecret) {
        return false;
      }

      const values = properties.map((path) => this.getByPath(payload.data, path));
      const raw = values.join('') + String(timestamp) + this.eventsSecret;
      const computed = crypto.createHash('sha256').update(raw).digest('hex');

      return computed.toLowerCase() === String(checksum).toLowerCase();
    } catch (err) {
      this.logger.error('Error verificando firma de evento Wompi', err);
      return false;
    }
  }

  private getByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  generateReference(orderId: string): string {
    return `ZIFCOR-${orderId}`.toUpperCase();
  }
}
