import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { decimalPattern } from '../../proveedores/dto/proveedores.dto';
export class WeightReturnDto {
  @IsString() @IsNotEmpty() weightShipmentId!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
export class ReturnIntakeDto {
  @IsString() @Matches(decimalPattern) observed!: string;
  @IsDateString() observedAt!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) conditionNote!: string;
  @IsOptional() @IsString() @MaxLength(200) evidenceRef?: string;
}
export class ResolveReturnDto {
  @IsString() @Matches(decimalPattern) usable!: string;
  @IsString() @Matches(decimalPattern) blocked!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsOptional() @IsString() @MaxLength(200) reconciliationRef?: string;
}
