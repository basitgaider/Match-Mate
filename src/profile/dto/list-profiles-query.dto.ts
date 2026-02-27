import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProfilesQueryDto {
  @IsOptional()
  @IsIn(['my_city', 'all'], {
    message: 'city must be "my_city" or "all"',
  })
  city?: 'my_city' | 'all' = 'all';

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
