import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiPropertyOptional({
    description: 'Book ID (null for general/account-level tickets)',
    example: 'BK001',
  })
  @IsOptional()
  @IsString()
  book_id: string | null = null;

  @ApiProperty({
    description: 'Ticket subject',
    example: 'Issue with royalty payment',
  })
  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(5, { message: 'Subject must be at least 5 characters' })
  @MaxLength(200, { message: 'Subject must not exceed 200 characters' })
  subject: string;

  @ApiProperty({
    description: 'Detailed ticket description',
    example: 'I have not received my Q3 royalty payment...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description: string;
}
