import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ example: 'Checked with warehouse team: stock was replenished today.' })
  @IsString()
  @IsNotEmpty({ message: 'Internal note cannot be empty' })
  @MaxLength(5000, { message: 'Internal note cannot exceed 5000 characters' })
  content: string;
}
