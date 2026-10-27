import { IsOptional, IsString, IsNumber, IsArray, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookDto {
  @ApiPropertyOptional({ example: 'Published & Live' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 499 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  author_royalty_per_copy?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total_copies_sold?: number;

  @ApiPropertyOptional({ example: 7500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total_royalty_earned?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  royalty_paid?: number;

  @ApiPropertyOptional({ example: 7500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  royalty_pending?: number;

  @ApiPropertyOptional({ example: '2026-10-28' })
  @IsOptional()
  @IsString()
  last_royalty_payout_date?: string;

  @ApiPropertyOptional({ example: 'Repro Books India' })
  @IsOptional()
  @IsString()
  print_partner?: string;

  @ApiPropertyOptional({ example: ['Amazon India', 'Flipkart', 'BookLeaf Bookstore'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  available_on?: string[];
}
