import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
export class ReasonDto {
  @IsString() @Matches(/\S/) reason!: string;
}
export class ExceptionDto extends ReasonDto {
  @IsIn(['CANCEL_ORDER', 'CLOSE_DIFFERENCE', 'REASSIGN', 'REVERSE_RECEIPT'])
  kind!: string;
  @IsString() @Matches(/\S/) targetId!: string;
  @IsOptional() @IsString() orderLineId?: string;
}
export class DecisionDto extends ReasonDto {
  @IsBoolean() approve!: boolean;
}
export class SnapshotDto {
  @IsInt() @Min(0) physical!: number;
  @IsString() @Matches(/\S/) observedAt!: string;
}
