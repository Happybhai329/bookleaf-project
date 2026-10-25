import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDraftDto {
  @ApiPropertyOptional({ example: 'Author called asking for expedited handling' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additional_context?: string;
}
