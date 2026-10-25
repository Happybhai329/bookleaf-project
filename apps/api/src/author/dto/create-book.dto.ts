import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({ example: 'Chronicles of the Silent Hill' })
  @IsString()
  @IsNotEmpty({ message: 'Book title is required' })
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Fiction / Mystery' })
  @IsString()
  @IsNotEmpty({ message: 'Genre is required' })
  @MaxLength(100)
  genre: string;

  @ApiPropertyOptional({ example: 399 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @ApiPropertyOptional({ example: '978-93-89123-45-6' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  isbn?: string;

  @ApiPropertyOptional({ example: 'Manuscript Submitted' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ example: ['Paperback', 'eBook'] })
  @IsOptional()
  available_on?: string[];
}
