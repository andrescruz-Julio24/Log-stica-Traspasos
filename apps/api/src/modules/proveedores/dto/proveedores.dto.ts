import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export const decimalPattern = /^\d{1,12}(\.\d{1,3})?$/;

export class SupplierReceiptProductDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsString() @Matches(decimalPattern) expected!: string;
}
export class CreateSupplierReceiptDto {
  @IsString() @IsNotEmpty() @MaxLength(150) supplier!: string;
  @IsString() @IsNotEmpty() destinationId!: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SupplierReceiptProductDto)
  items!: SupplierReceiptProductDto[];
}

export class SupplierInspectionProductDto {
  @IsString() @IsNotEmpty() receiptLineId!: string;
  @IsString() @Matches(decimalPattern) presented!: string;
  @IsString() @Matches(decimalPattern) accepted!: string;
  @IsString() @Matches(decimalPattern) blocked!: string;
}
export class InspectSupplierReceiptDto {
  @IsDateString() observedAt!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) evidenceRef?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SupplierInspectionProductDto)
  items!: SupplierInspectionProductDto[];
}
export class ReturnBlockedSupplierDto {
  @IsString() @Matches(decimalPattern) quantity!: string;
  @IsString() @Matches(/\S/) @MaxLength(500) reason!: string;
}
