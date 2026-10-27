require('dotenv').config({ path: './apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  const samplePath = path.resolve(__dirname, '../bookleaf_sample_data.json');
  const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

  const demoPassword = process.env.DEMO_PASSWORD || 'BookLeaf2024!';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  console.log('Clearing existing data from database...');
  await prisma.auditLog.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.author.deleteMany({});

  console.log('Creating Admin user...');
  const adminId = uuidv4();
  await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@bookleaf.in',
      password_hash: passwordHash,
      role: 'ADMIN',
      display_name: 'BookLeaf Admin Lead',
    },
  });

  console.log('Seeding 10 authors, books, and author users...');
  const usersMap = {}; // email -> userId

  for (const a of sampleData.authors) {
    await prisma.author.create({
      data: {
        author_id: a.author_id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        city: a.city,
        joined_date: a.joined_date,
      },
    });

    const uId = uuidv4();
    usersMap[a.email] = uId;
    await prisma.user.create({
      data: {
        id: uId,
        email: a.email,
        password_hash: passwordHash,
        role: 'AUTHOR',
        author_id: a.author_id,
        display_name: a.name,
      },
    });

    for (const b of a.books) {
      await prisma.book.create({
        data: {
          book_id: b.book_id,
          author_id: a.author_id,
          title: b.title,
          isbn: b.isbn,
          genre: b.genre,
          publication_date: b.publication_date || null,
          status: b.status,
          mrp: b.mrp !== null && b.mrp !== undefined ? b.mrp : null,
          author_royalty_per_copy: b.author_royalty_per_copy !== null && b.author_royalty_per_copy !== undefined ? b.author_royalty_per_copy : null,
          total_copies_sold: b.total_copies_sold || 0,
          total_royalty_earned: b.total_royalty_earned || 0,
          royalty_paid: b.royalty_paid || 0,
          royalty_pending: b.royalty_pending || 0,
          last_royalty_payout_date: b.last_royalty_payout_date || null,
          print_partner: b.print_partner || null,
          available_on: b.available_on || [],
        },
      });
    }
  }

  // Also seed Happy Bhasin as AUTH011 with BK019
  console.log('Seeding Happy Bhasin author profile...');
  await prisma.author.create({
    data: {
      author_id: 'AUTH011',
      name: 'Happy Bhasin',
      email: 'bhasinhappy0506@gmail.com',
      phone: '+91-98765-00000',
      city: 'Delhi',
      joined_date: '2026-10-25',
    },
  });

  await prisma.user.create({
    data: {
      id: uuidv4(),
      email: 'bhasinhappy0506@gmail.com',
      password_hash: passwordHash,
      role: 'AUTHOR',
      author_id: 'AUTH011',
      display_name: 'Happy Bhasin',
    },
  });

  await prisma.book.create({
    data: {
      book_id: 'BK019',
      author_id: 'AUTH011',
      title: 'my life my rules',
      isbn: '978-93-3881587',
      genre: 'Self-Help / Motivation',
      publication_date: '2026-10-27',
      status: 'Published & Live',
      mrp: 500,
      author_royalty_per_copy: 60,
      total_copies_sold: 100,
      total_royalty_earned: 6000,
      royalty_paid: 0,
      royalty_pending: 6000,
      last_royalty_payout_date: null,
      print_partner: 'Epitome Books',
      available_on: ['Amazon India', 'Flipkart', 'BookLeaf Bookstore', 'Amazon US'],
    },
  });

  console.log('Seeding demo tickets BL-0001 through BL-0006...');
  const now = new Date();

  // Ticket 1: BL-0001 (Priya Sharma - Royalty)
  const t1Id = uuidv4();
  await prisma.ticket.create({
    data: {
      id: t1Id,
      reference: 'BL-0001',
      author_id: 'AUTH001',
      book_id: 'BK001',
      subject: 'Royalty payment not received for Q3 2025',
      description: 'I was expecting a royalty payment for Whispers of the Ganges for Q3 2025, but I have not received any payment yet. My bank details are up to date. Could you please check the status of my pending royalty payment? The dashboard shows ₹3,570 pending.',
      status: 'OPEN',
      suggested_category: 'ROYALTY_PAYMENTS',
      suggested_priority: 'HIGH',
      final_category: 'ROYALTY_PAYMENTS',
      final_priority: 'HIGH',
      ai_reasoning: 'Author reports missing royalty payment with specific amount reference. Royalty-related keywords detected.',
      ai_provider: 'gemini',
      ai_confidence: 'high',
      ai_classified_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Ticket 2: BL-0002 (Rohit Kapoor - Distribution stock issue)
  const t2Id = uuidv4();
  await prisma.ticket.create({
    data: {
      id: t2Id,
      reference: 'BL-0002',
      author_id: 'AUTH002',
      book_id: 'BK004',
      subject: 'Startup Sutra is showing out of stock on Flipkart',
      description: 'My book Startup Sutra has been showing as out of stock on Flipkart for the last 48 hours while active on Amazon India. Potential readers are reaching out asking where to buy. Can BookLeaf operations trigger an inventory feed re-sync with Flipkart?',
      status: 'OPEN',
      suggested_category: 'DISTRIBUTION_AVAILABILITY',
      suggested_priority: 'HIGH',
      final_category: 'DISTRIBUTION_AVAILABILITY',
      final_priority: 'HIGH',
      ai_reasoning: 'Author reports out-of-stock status on major retail channel Flipkart. High commercial impact on active sales.',
      ai_provider: 'gemini',
      ai_confidence: 'high',
      ai_classified_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Ticket 3: BL-0003 (Kavita Deshmukh - Typesetting inquiry)
  const t3Id = uuidv4();
  await prisma.ticket.create({
    data: {
      id: t3Id,
      reference: 'BL-0003',
      author_id: 'AUTH009',
      book_id: 'BK015',
      subject: 'When will Raising Roots move to proofreading stage?',
      description: 'My book Raising Roots has been in the Typesetting stage for over 3 weeks now. I was told it would take about 5-7 business days. Can you please provide an update on when it will move to the proofreading stage?',
      status: 'OPEN',
      suggested_category: 'BOOK_STATUS_PRODUCTION',
      suggested_priority: 'MEDIUM',
      final_category: 'BOOK_STATUS_PRODUCTION',
      final_priority: 'MEDIUM',
      ai_reasoning: 'Author inquiring about production stage progress and typesetting turnaround time. Production inquiry detected.',
      ai_provider: 'gemini',
      ai_confidence: 'high',
      ai_classified_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Ticket 4: BL-0004 (ISBN issue)
  const t4Id = uuidv4();
  await prisma.ticket.create({
    data: {
      id: t4Id,
      reference: 'BL-0004',
      author_id: 'AUTH002',
      book_id: 'BK003',
      subject: 'Incorrect ISBN displayed on Amazon listing',
      description: 'The ISBN shown on the Amazon India listing for Code & Karma does not match the ISBN assigned by BookLeaf. The listing shows a different ISBN number. This needs to be corrected urgently.',
      status: 'IN_PROGRESS',
      suggested_category: 'ISBN_METADATA',
      suggested_priority: 'HIGH',
      final_category: 'ISBN_METADATA',
      final_priority: 'HIGH',
      assigned_admin_id: adminId,
      assigned_admin_name: 'BookLeaf Admin Lead',
      ai_reasoning: 'ISBN discrepancy on retail listing. Duplicate/incorrect ISBN keywords detected.',
      ai_provider: 'gemini',
      ai_confidence: 'high',
      ai_classified_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      id: uuidv4(),
      ticket_id: t4Id,
      sender_id: adminId,
      sender_name: 'BookLeaf Admin Lead',
      sender_role: 'ADMIN',
      visibility: 'PUBLIC',
      content: 'Thank you for bringing this to our attention, Rohit. We have escalated this ISBN discrepancy to our production team for immediate investigation. We will update you within 48 hours once we have more information.',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      id: uuidv4(),
      ticket_id: t4Id,
      sender_id: adminId,
      sender_name: 'BookLeaf Admin Lead',
      sender_role: 'ADMIN',
      visibility: 'INTERNAL_NOTE',
      content: 'Escalated to Repro Books dispatch team for stock confirmation. ISBN metadata feed will be pushed today.',
      is_ai_draft: false,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ All data seeded successfully to PostgreSQL!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
