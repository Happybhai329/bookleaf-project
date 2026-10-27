import { Store } from 'express-session';
import { PrismaService } from '../../data/prisma.service';

export class PrismaSessionStore extends Store {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async get(sid: string, callback: (err?: any, session?: any) => void): Promise<void> {
    try {
      const record = await this.prisma.session.findUnique({
        where: { id: sid },
      });

      if (!record) {
        return callback(null, null);
      }

      if (record.expiresAt && record.expiresAt < new Date()) {
        await this.prisma.session.delete({ where: { id: sid } }).catch(() => {});
        return callback(null, null);
      }

      const data = JSON.parse(record.data);
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, session: any, callback?: (err?: any) => void): Promise<void> {
    try {
      const expiresAt = session?.cookie?.expires
        ? new Date(session.cookie.expires)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const data = JSON.stringify(session);

      await this.prisma.session.upsert({
        where: { id: sid },
        update: { data, expiresAt },
        create: { id: sid, data, expiresAt },
      });

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void): Promise<void> {
    try {
      await this.prisma.session.delete({ where: { id: sid } }).catch(() => {});
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async touch(sid: string, session: any, callback?: (err?: any) => void): Promise<void> {
    try {
      const expiresAt = session?.cookie?.expires
        ? new Date(session.cookie.expires)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.prisma.session
        .update({
          where: { id: sid },
          data: { expiresAt },
        })
        .catch(() => {});

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}
