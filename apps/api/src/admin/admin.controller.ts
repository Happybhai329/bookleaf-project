import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { UserRole } from '@bookleaf/shared';
import type { AuthUser } from '@bookleaf/shared';

import { UpdateBookDto } from './dto/update-book.dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getAdminUser(req: Request): AuthUser {
    const session = req.session as any;
    if (!session?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      id: session.userId,
      email: session.userEmail || 'admin@bookleaf.in',
      role: UserRole.ADMIN,
      author_id: null,
      display_name: session.userName || 'Admin',
    };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get operational metrics and queue stats' })
  @ApiResponse({ status: 200, description: 'Admin dashboard metrics' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('authors')
  @ApiOperation({ summary: 'Get all authors directory with publishing statistics' })
  @ApiResponse({ status: 200, description: 'Authors directory' })
  getAuthors() {
    return this.adminService.getAuthors();
  }

  @Get('books')
  @ApiOperation({ summary: 'Get all books master catalog' })
  @ApiResponse({ status: 200, description: 'Master book catalog' })
  getBooks() {
    return this.adminService.getBooks();
  }

  @Patch('books/:bookId')
  @ApiOperation({ summary: 'Update book production status, MRP, or sales figures' })
  @ApiResponse({ status: 200, description: 'Book updated successfully' })
  updateBook(
    @Param('bookId') bookId: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.adminService.updateBook(bookId, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get paginated, filterable global ticket queue' })
  @ApiResponse({ status: 200, description: 'Filtered list of tickets' })
  getTickets(@Query() filters: TicketFilterDto) {
    return this.adminService.getTickets(filters);
  }

  @Get('tickets/:ticketId')
  @ApiOperation({ summary: 'Get ticket detail with author, book, notes, and replies' })
  @ApiResponse({ status: 200, description: 'Full ticket detail for admin' })
  getTicket(@Param('ticketId') ticketId: string) {
    return this.adminService.getTicket(ticketId);
  }

  @Patch('tickets/:ticketId')
  @ApiOperation({ summary: 'Update ticket status, final category, or priority' })
  @ApiResponse({ status: 200, description: 'Ticket updated' })
  updateTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: Request,
  ) {
    const admin = this.getAdminUser(req);
    return this.adminService.updateTicket(ticketId, dto, admin);
  }

  @Post('tickets/:ticketId/draft')
  @ApiOperation({ summary: 'Generate AI response draft using policy knowledge base' })
  @ApiResponse({ status: 200, description: 'Generated draft' })
  generateDraft(
    @Param('ticketId') ticketId: string,
    @Body() dto: GenerateDraftDto,
  ) {
    return this.adminService.generateDraft(ticketId, dto?.additional_context);
  }

  @Post('tickets/:ticketId/replies')
  @ApiOperation({ summary: 'Send an official public response to the author' })
  @ApiResponse({ status: 201, description: 'Reply created' })
  addReply(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateReplyDto,
    @Req() req: Request,
  ) {
    const admin = this.getAdminUser(req);
    return this.adminService.addReply(ticketId, dto.content, admin);
  }

  @Post('tickets/:ticketId/notes')
  @ApiOperation({ summary: 'Create a private internal note (visible only to admins)' })
  @ApiResponse({ status: 201, description: 'Internal note created' })
  addNote(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateNoteDto,
    @Req() req: Request,
  ) {
    const admin = this.getAdminUser(req);
    return this.adminService.addNote(ticketId, dto.content, admin);
  }

  @Patch('tickets/:ticketId/assignment')
  @ApiOperation({ summary: 'Assign or unassign a ticket to an admin' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  assignTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: AssignTicketDto,
    @Req() req: Request,
  ) {
    const admin = this.getAdminUser(req);
    return this.adminService.assignTicket(ticketId, dto.admin_id ?? null, admin);
  }
}
