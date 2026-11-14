import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { decimalPattern } from '../../proveedores/dto/proveedores.dto';

export class MeasuredTransferItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsString() @Matches(decimalPattern) requested!: string;
  @IsOptional() @IsInt() @Min(0) estimatedPackages?: number;
  @IsOptional() @IsString() @Matches(decimalPattern) averageWeightKg?: string;
}
export class CreateMeasuredTransferDto {
  @IsString() @IsNotEmpty() originId!: string;
  @IsString() @IsNotEmpty() destinationId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => MeasuredTransferItemDto)
  items!: MeasuredTransferItemDto[];
}
export class MeasuredReservationDto {
  @IsString() @IsNotEmpty() lineId!: string;
  @IsString() @Matches(decimalPattern) quantity!: string;
}
export class MeasuredDispatchDto {
  @IsOptional() @IsString() tripId?: string;
  @IsString() @IsNotEmpty() lineId!: string;
  @IsString() @Matches(decimalPattern) quantity!: string;
  @IsString() @IsNotEmpty() @MaxLength(150) custodian!: string;
}
export class MeasuredReceiptDto {
  @IsString() @IsNotEmpty() dispatchId!: string;
  @IsString() @Matches(decimalPattern) presented!: string;
  @IsString() @Matches(decimalPattern) accepted!: string;
  @IsString() @Matches(decimalPattern) blocked!: string;
  @IsDateString() observedAt!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) evidenceRef?: string;
}
