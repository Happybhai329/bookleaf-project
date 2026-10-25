import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AuthorService } from './author.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AuthorReplyDto } from './dto/create-reply.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { UserRole } from '@bookleaf/shared';

@ApiTags('Author')
@ApiCookieAuth()
@Controller('author')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.AUTHOR)
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  private getAuthorId(req: Request): string {
    const authorId = (req.session as any)?.authorId;
    if (!authorId) {
      // Look it up from the user
      const userId = (req.session as any)?.userId;
      throw new ForbiddenException('Author identity not found in session');
    }
    return authorId;
  }

  private getSessionInfo(req: Request): {
    authorId: string;
    userId: string;
    userName: string;
  } {
    const session = req.session as any;
    return {
      authorId: session.authorId,
      userId: session.userId,
      userName: session.userName || 'Author',
    };
  }

  @Get('profile')
  @ApiOperation({ summary: "Get author's own profile" })
  @ApiResponse({ status: 200, description: 'Author profile' })
  getProfile(@Req() req: Request) {
    return this.authorService.getProfile(this.getAuthorId(req));
  }

  @Get('dashboard')
  @ApiOperation({ summary: "Get author's dashboard with metrics" })
  @ApiResponse({ status: 200, description: 'Author dashboard data' })
  getDashboard(@Req() req: Request) {
    return this.authorService.getDashboard(this.getAuthorId(req));
  }

  @Get('books')
  @ApiOperation({ summary: "Get author's books" })
  @ApiResponse({ status: 200, description: 'List of author books' })
  getBooks(@Req() req: Request) {
    return this.authorService.getBooks(this.getAuthorId(req));
  }

  @Get('books/:bookId')
  @ApiOperation({ summary: 'Get a specific book by ID' })
  @ApiResponse({ status: 200, description: 'Book details' })
  @ApiResponse({ status: 403, description: 'Book does not belong to author' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  getBook(@Req() req: Request, @Param('bookId') bookId: string) {
    return this.authorService.getBook(this.getAuthorId(req), bookId);
  }

  @Get('tickets')
  @ApiOperation({ summary: "Get author's support tickets" })
  @ApiResponse({ status: 200, description: "Author's tickets" })
  getTickets(@Req() req: Request) {
    return this.authorService.getTickets(this.getAuthorId(req));
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Submit a new support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createTicket(
    @Req() req: Request,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    const { authorId, userId, userName } = this.getSessionInfo(req);
    return this.authorService.createTicket(
      authorId,
      userId,
      userName,
      createTicketDto,
    );
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get ticket detail with conversation' })
  @ApiResponse({ status: 200, description: 'Ticket detail' })
  @ApiResponse({ status: 403, description: 'Ticket does not belong to author' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  getTicket(@Req() req: Request, @Param('ticketId') ticketId: string) {
    return this.authorService.getTicket(this.getAuthorId(req), ticketId);
  }

  @Post('tickets/:ticketId/replies')
  @ApiOperation({ summary: 'Author responds to ticket' })
  @ApiResponse({ status: 201, description: 'Reply posted' })
  createReply(
    @Req() req: Request,
    @Param('ticketId') ticketId: string,
    @Body() dto: AuthorReplyDto,
  ) {
    const { authorId, userId, userName } = this.getSessionInfo(req);
    return this.authorService.createReply(
      authorId,
      userId,
      userName,
      ticketId,
      dto.content,
    );
  }

  @Post('tickets/:ticketId/resolve')
  @ApiOperation({ summary: 'Author marks query as resolved' })
  @ApiResponse({ status: 200, description: 'Ticket resolved' })
  resolveTicket(
    @Req() req: Request,
    @Param('ticketId') ticketId: string,
  ) {
    const { authorId, userId, userName } = this.getSessionInfo(req);
    return this.authorService.closeTicket(authorId, userId, userName, ticketId);
  }

  @Post('books')
  @ApiOperation({ summary: 'Register a new book title' })
  @ApiResponse({ status: 201, description: 'Book registered' })
  createBook(
    @Req() req: Request,
    @Body() dto: CreateBookDto,
  ) {
    const authorId = this.getAuthorId(req);
    return this.authorService.createBook(authorId, dto);
  }
}
