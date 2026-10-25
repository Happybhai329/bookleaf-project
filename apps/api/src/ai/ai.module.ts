import { Module, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { MockAiProvider } from './mock-ai.provider';
import { GeminiAiProvider } from './gemini-ai.provider';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [
    AiService,
    MockAiProvider,
    GeminiAiProvider,
    {
      provide: 'AI_PROVIDER',
      useFactory: (geminiProvider: GeminiAiProvider, mockProvider: MockAiProvider) => {
        const logger = new Logger('AiModuleFactory');
        const providerSetting = (process.env.AI_PROVIDER || 'mock').trim().toLowerCase();
        if (providerSetting === 'gemini') {
          logger.log('Active AI Provider: GeminiAiProvider (Google Gemini API)');
          return geminiProvider;
        }
        logger.log('Active AI Provider: MockAiProvider (Deterministic Rule-Based Simulation)');
        return mockProvider;
      },
      inject: [GeminiAiProvider, MockAiProvider],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
