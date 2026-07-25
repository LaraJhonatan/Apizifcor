import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString,
  IsUUID, MaxLength, Min, ValidateNested, ArrayMaxSize,
} from 'class-validator';

export class QuoteRequestFileDto {
  @IsString()
  @MaxLength(1000)
  url: string;

  @IsString()
  @MaxLength(300)
  nombreOriginal: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tamanoBytes?: number;
}

export class CreateQuoteRequestDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensaje?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuoteRequestFileDto)
  archivos?: QuoteRequestFileDto[];
}
