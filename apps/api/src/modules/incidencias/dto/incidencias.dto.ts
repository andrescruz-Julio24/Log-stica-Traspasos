import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
export class ResolveIncidentDto {
  @IsString() @Matches(/\S/) reason!: string;
  @IsOptional() @IsIn(['RELEASE', 'QUARANTINE']) disposition?: string;
}
export class CreateIncidentDto {
  @IsOptional() @IsString() allocationId?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() transferId?: string;
  @IsOptional() @IsString() dispatchId?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() custodian?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() evidence?: string;
  @IsOptional() @IsBoolean() blocking?: boolean;
  @IsString() @IsNotEmpty() type!: string;
  @IsString() @Matches(/\S/) notes!: string;
}
