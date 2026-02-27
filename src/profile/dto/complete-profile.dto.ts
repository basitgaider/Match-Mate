import {
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatus {
  MARRIED = 'MARRIED',
  UNMARRIED = 'UNMARRIED',
  WIDOW = 'WIDOW',
  DIVORCED = 'DIVORCED',
}

export class CompleteProfileDto {
  @IsOptional()
  @IsUrl()
  profilePhoto?: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @MaxLength(200)
  location: string;

  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @MaxLength(150)
  profession: string;

  @IsString()
  @MaxLength(200)
  education: string;

  @IsNumber()
  @Min(50, { message: 'Height must be at least 50 cm' })
  @Max(300, { message: 'Height must be at most 300 cm' })
  height: number;

  @IsString()
  @MaxLength(2000)
  aboutYourself: string;
}
