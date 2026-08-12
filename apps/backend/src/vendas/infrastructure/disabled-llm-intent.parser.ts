import { Injectable } from '@nestjs/common';
import type { LlmIntentParser } from '../domain/busca-ia/llm-intent-parser.port';

@Injectable()
export class DisabledLlmIntentParser implements LlmIntentParser {
  readonly enabled = false;

  parse(): Promise<null> {
    return Promise.resolve(null);
  }
}
