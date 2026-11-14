import { InventoryBaseUnit } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateCatalogProductDto {
  @IsString() @IsNotEmpty() @MaxLength(180) name!: string;
  @IsEnum(InventoryBaseUnit) baseUnit!: InventoryBaseUnit;
  @IsOptional() @IsString() @MaxLength(120) presentation?: string;
  @IsOptional() @IsString() @MaxLength(120) variant?: string;
  @IsOptional() @IsString() @MaxLength(160) externalLabel?: string;
}
