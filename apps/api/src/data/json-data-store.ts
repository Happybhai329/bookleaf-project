import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type {
  User,
  Author,
  Book,
  Ticket,
  TicketMessage,
  AuditEntry,
} from '@bookleaf/shared';

export interface DataStore {
  users: User[];
  authors: Author[];
  books: Book[];
  tickets: Ticket[];
  messages: TicketMessage[];
  audit: AuditEntry[];
  meta: {
    seeded: boolean;
    last_updated: string;
    ticket_counter: number;
  };
}

const EMPTY_STORE: DataStore = {
  users: [],
  authors: [],
  books: [],
  tickets: [],
  messages: [],
  audit: [],
  meta: {
    seeded: false,
    last_updated: new Date().toISOString(),
    ticket_counter: 0,
  },
};

@Injectable()
export class JsonDataStore {
  private readonly logger = new Logger(JsonDataStore.name);
  private data: DataStore;
  private readonly dataDir: string;
  private readonly storePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    if (process.env.DATA_DIR) {
      this.dataDir = path.resolve(process.env.DATA_DIR);
    } else {
      const candidates = [
        path.resolve(process.cwd(), 'data'),
        path.resolve(process.cwd(), '..', '..', 'data'),
        path.resolve(__dirname, '..', '..', '..', 'data'),
        path.resolve(__dirname, '..', '..', '..', '..', 'data'),
      ];
      // Pick first existing or default to candidates[0]
      this.dataDir = candidates.find((c) => fs.existsSync(c)) || candidates[0];
    }
    this.storePath = path.join(this.dataDir, 'dev-store.json');
    this.data = this.loadOrCreate();
  }

  private loadOrCreate(): DataStore {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.storePath)) {
      try {
        const raw = fs.readFileSync(this.storePath, 'utf-8');
        const parsed = JSON.parse(raw) as DataStore;
        this.logger.log('Loaded existing dev-store.json');
        return parsed;
      } catch (err) {
        this.logger.warn('Failed to load dev-store.json, creating fresh store');
      }
    }

    this.logger.log('Creating new dev-store.json');
    return JSON.parse(JSON.stringify(EMPTY_STORE));
  }

  getData(): DataStore {
    return this.data;
  }

  getStorePath(): string {
    return this.storePath;
  }

  isSeeded(): boolean {
    return this.data.meta.seeded;
  }

  markSeeded(): void {
    this.data.meta.seeded = true;
  }

  getNextTicketNumber(): number {
    this.data.meta.ticket_counter += 1;
    return this.data.meta.ticket_counter;
  }

  /** Enqueue a serialized write to avoid concurrent file corruption */
  async persist(): Promise<void> {
    this.data.meta.last_updated = new Date().toISOString();

    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const tmpPath = this.storePath + '.tmp';
        const json = JSON.stringify(this.data, null, 2);
        fs.writeFileSync(tmpPath, json, 'utf-8');
        fs.renameSync(tmpPath, this.storePath);
      } catch (err) {
        this.logger.error('Failed to persist data store', err);
      }
    });

    return this.writeQueue;
  }
}
