import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReplyDto {
  @ApiProperty({ example: 'Thank you for contacting BookLeaf. We are reviewing this...' })
  @IsString()
  @IsNotEmpty({ message: 'Reply content cannot be empty' })
  @MaxLength(5000, { message: 'Reply cannot exceed 5000 characters' })
  content: string;
}
