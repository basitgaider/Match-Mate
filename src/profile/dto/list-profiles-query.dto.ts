import { IsIn, IsInt, IsOptional, Max, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProfilesQueryDto {
  @IsOptional()
  @IsIn(['my_city', 'all'], {
    message: 'city must be "my_city" or "all"',
  })
  city?: 'my_city' | 'all' = 'all';

  /** Search by name (first/last), city (location), or age (numeric string). */
  @IsOptional()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(120)
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(120)
  maxAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
