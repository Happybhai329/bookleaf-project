import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthorReplyDto {
  @ApiProperty({ example: 'Thank you for looking into this. Here is the requested detail...' })
  @IsString()
  @IsNotEmpty({ message: 'Reply content cannot be empty' })
  @MaxLength(5000, { message: 'Reply must not exceed 5000 characters' })
  content: string;
}
