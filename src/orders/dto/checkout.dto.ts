import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/** Datos de envío/contacto que se piden antes de pagar (estilo Mercado Libre/Amazon). */
export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreCompleto: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefono: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  departamento: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
