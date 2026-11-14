import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { decimalPattern } from '../../proveedores/dto/proveedores.dto';
export class CreateWeightOrderDto {
  @IsString() @IsNotEmpty() @MaxLength(150) customer!: string;
  @IsString() @IsNotEmpty() destinationId!: string;
  @IsString() @IsNotEmpty() productId!: string;
  @IsString() @Matches(decimalPattern) plannedKg!: string;
  @IsOptional() @IsInt() @Min(1) estimatedBoxes?: number;
  @IsOptional() @IsString() @Matches(decimalPattern) averageBoxKg?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}
export class ReserveWeightOrderDto {
  @IsString() @Matches(decimalPattern) quantityKg!: string;
}
export class DispatchWeightOrderDto {
  @IsOptional() @IsString() tripId?: string;
  @IsString() @Matches(decimalPattern) actualKg!: string;
  @IsString() @IsNotEmpty() @MaxLength(150) custodian!: string;
  @IsOptional() @IsString() @MaxLength(200) documentRef?: string;
}
