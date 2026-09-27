import { Type } from 'class-transformer';
import {
  IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, IsPositive, IsInt, Min,
  IsArray, IsEmail, IsIn, ValidateNested, Matches, IsDefined,
} from 'class-validator';
import { GUID_RE } from '../guid';

/**
 * Sin topes máximos a propósito: una carga que supera los vehículos no es un error de datos,
 * es una cotización especial (el servicio responde ok:false con el motivo y se deriva a WhatsApp).
 */
export class CotizarDto {
  @IsString()
  @IsNotEmpty({ message: 'Selecciona el destino.' })
  @Matches(GUID_RE, { message: 'El destino seleccionado no está disponible.' })
  rutaId: string;

  @IsString()
  @IsNotEmpty({ message: 'Indica qué producto vas a transportar.' })
  @MaxLength(200)
  producto: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipoMercancia?: string;

  @IsNumber({}, { message: 'El peso debe ser un número.' })
  @IsPositive({ message: 'El peso debe ser mayor que cero.' })
  pesoKg: number;

  @IsNumber({}, { message: 'El largo debe ser un número.' })
  @IsPositive({ message: 'El largo debe ser mayor que cero.' })
  largoM: number;

  @IsNumber({}, { message: 'El ancho debe ser un número.' })
  @IsPositive({ message: 'El ancho debe ser mayor que cero.' })
  anchoM: number;

  @IsNumber({}, { message: 'El alto debe ser un número.' })
  @IsPositive({ message: 'El alto debe ser mayor que cero.' })
  altoM: number;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  cantidad: number;

  @IsOptional()
  @IsArray()
  @Matches(GUID_RE, { each: true, message: 'Uno de los servicios adicionales ya no está disponible. Recarga la página.' })
  servicioIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  puntoRecogida?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  puntoEntrega?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentarios?: string;
}

export class CompradorLogisticaDto {
  @IsIn(['NIT', 'CC', 'CE', 'PAS'], { message: 'Tipo de documento no válido.' })
  tipoDocumento: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa el número de documento.' })
  @MaxLength(40)
  documento: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa la razón social o el nombre completo.' })
  @MaxLength(200)
  nombre: string;

  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(200)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa un teléfono de contacto.' })
  @MaxLength(30)
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa la dirección de facturación.' })
  @MaxLength(300)
  direccion: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa la ciudad de facturación.' })
  @MaxLength(100)
  ciudad: string;
}

export class ConfirmarCotizacionDto extends CotizarDto {
  @IsDefined({ message: 'Faltan los datos de facturación.' })
  @ValidateNested()
  @Type(() => CompradorLogisticaDto)
  comprador: CompradorLogisticaDto;
}

export class VerificarPagoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  transactionId: string;
}
