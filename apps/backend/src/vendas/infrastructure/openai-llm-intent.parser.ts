import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LlmCatalogHints,
  LlmIntentParser,
} from '../domain/busca-ia/llm-intent-parser.port';
import {
  emptyIntent,
  type SearchIntent,
} from '../domain/busca-ia/search-intent';

const SYSTEM_PROMPT = `Você extrai filtros de busca de produtos para um PDV de farmácia.
Responda APENAS JSON válido com:
{"search": string|null, "categoryName": string|null, "brandName": string|null, "priceMin": number|null, "priceMax": number|null, "inStock": boolean|null, "similarTo": string|null}
Use apenas categorias e marcas das dicas quando possível.
Nunca invente produtos, preços ou estoque.
Não inclua dados pessoais.`;

@Injectable()
export class OpenAiLlmIntentParser implements LlmIntentParser {
  private readonly logger = new Logger(OpenAiLlmIntentParser.name);
  private readonly apiKey: string | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const key = config.get<string>('OPENAI_API_KEY')?.trim();
    this.apiKey = key || null;
    this.model = config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  async parse(
    query: string,
    hints: LlmCatalogHints,
  ): Promise<SearchIntent | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: JSON.stringify({
                  query,
                  categories: hints.categories.slice(0, 40),
                  brands: hints.brands.slice(0, 40),
                }),
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(`LLM indisponível (${response.status}).`);
        return null;
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) return null;
      return this.toIntent(
        query,
        JSON.parse(content) as Record<string, unknown>,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao interpretar via LLM: ${
          error instanceof Error ? error.message : 'erro'
        }`,
      );
      return null;
    }
  }

  private toIntent(raw: string, parsed: Record<string, unknown>): SearchIntent {
    const intent = emptyIntent(raw);
    intent.search = this.str(parsed.search);
    intent.categoryName = this.str(parsed.categoryName);
    intent.brandName = this.str(parsed.brandName);
    intent.priceMin = this.num(parsed.priceMin);
    intent.priceMax = this.num(parsed.priceMax);
    intent.inStock =
      typeof parsed.inStock === 'boolean' ? parsed.inStock : null;
    intent.similarTo = this.str(parsed.similarTo);
    if (intent.similarTo && !intent.search) intent.search = intent.similarTo;
    return intent;
  }

  private str(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private num(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return null;
    }
    return value;
  }
}
