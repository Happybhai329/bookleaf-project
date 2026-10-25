import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiPropertyOptional({ example: 'usr_admin_123', nullable: true })
  @IsOptional()
  @IsString()
  admin_id?: string | null;
}
