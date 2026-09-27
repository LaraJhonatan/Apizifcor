import { BadRequestException, PipeTransform } from '@nestjs/common';

/**
 * Formato GUID de SQL Server. No se usa @IsUUID/ParseUUIDPipe porque rechazan GUIDs reales
 * generados por SQL Server (sin nibble de versión RFC 4122); sin esta validación un valor
 * basura llega a la consulta y SQL Server responde con error 500 al convertirlo.
 */
export const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class ParseGuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !GUID_RE.test(value)) {
      throw new BadRequestException('Identificador no válido.');
    }
    return value;
  }
}
