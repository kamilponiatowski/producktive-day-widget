import { z } from 'zod'

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DAILY_LIMIT = 10
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const MIN_BLOCK_DURATION_MINUTES = 15
const MAX_DAY_END_MINUTES = 30 * 60
const DEFAULT_MODEL = 'gpt-4o-mini'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

// ── Public config type ───────────────────────────────────────────────────────

/** Configuration for the Producktive Day server handler. */
export interface DayAgentConfig {
  /**
   * Your OpenAI API key.
   * Pass a function to resolve it lazily per-request (recommended for server
   * frameworks with runtime config, e.g. Nuxt's `useRuntimeConfig()`).
   */
  apiKey: string | (() => string | Promise<string>)
  /** OpenAI model to use. Defaults to 'gpt-4o-mini'. */
  model?: string | (() => string)
  /**
   * When `true` (or a function returning `true`), the handler returns a mock
   * response without calling OpenAI. Useful for local development.
   */
  mock?: boolean | (() => boolean)
  /**
   * List of allowed request origin hostnames (e.g. `['example.com']`).
   * The host making the request is always allowed (same-host).
   * Omit to allow all origins.
   */
  allowedOrigins?: string[]
  /** Maximum AI requests per unique user per calendar day. Default: 10. */
  dailyLimit?: number
}

// ── Rate limiter ─────────────────────────────────────────────────────────────

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

// ── Zod schemas ───────────────────────────────────────────────────────────────

const baseBlockSchema = z.object({
  title: z.string().min(1).max(80),
  startMinutes: z.number().int().min(0).max(MAX_DAY_END_MINUTES - MIN_BLOCK_DURATION_MINUTES),
  endMinutes: z.number().int().min(MIN_BLOCK_DURATION_MINUTES).max(MAX_DAY_END_MINUTES),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.string().min(1).max(40),
  note: z.string().max(240).default(''),
})

const validatedBlockSchema = baseBlockSchema.refine(
  (b) => b.endMinutes - b.startMinutes >= MIN_BLOCK_DURATION_MINUTES,
  { message: 'Blocks must be at least 15 minutes long.' },
)

const dayPlanSchema = z.object({
  schemaVersion: z.literal(1),
  localDate: z.string().max(20),
  timezone: z.string().max(80),
  blocks: z
    .array(
      baseBlockSchema
        .extend({
          id: z.string().max(80).optional(),
          colorToken: z.string().max(40).optional(),
          source: z.enum(['manual', 'agent']).optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
        })
        .refine(
          (b) => b.endMinutes - b.startMinutes >= MIN_BLOCK_DURATION_MINUTES,
          { message: 'Blocks must be at least 15 minutes long.' },
        ),
    )
    .max(48),
})

const historyMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(900),
})

const requestSchema = z.object({
  locale: z.enum(['pl', 'en']).default('pl'),
  message: z.string().min(3).max(1200),
  history: z.array(historyMessageSchema).max(8).default([]),
  plan: dayPlanSchema,
})

const agentResponseSchema = z.object({
  mode: z.enum(['append', 'merge']).default('append'),
  reply: z.string().min(1).max(420),
  assumptions: z.array(z.string().max(150)).max(4).default([]),
  blocks: z.array(validatedBlockSchema).min(1).max(8),
  isMock: z.boolean().optional(),
})

// ── OpenAI structured output schema ──────────────────────────────────────────

const openAiJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'reply', 'assumptions', 'blocks'],
  properties: {
    mode: {
      type: 'string',
      enum: ['append', 'merge'],
      description: 'append for adding blocks, merge for fitting around existing blocks.',
    },
    reply: {
      type: 'string',
      minLength: 1,
      maxLength: 420,
      description: 'Concise user-facing explanation in the requested language.',
    },
    assumptions: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string', maxLength: 150 },
    },
    blocks: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'startMinutes', 'endMinutes', 'priority', 'category', 'note'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 80 },
          startMinutes: {
            type: 'integer',
            minimum: 0,
            maximum: MAX_DAY_END_MINUTES - MIN_BLOCK_DURATION_MINUTES,
          },
          endMinutes: {
            type: 'integer',
            minimum: MIN_BLOCK_DURATION_MINUTES,
            maximum: MAX_DAY_END_MINUTES,
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          category: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
            description:
              'Use stable categories: deepFocus, admin, movement, recovery, relationship, growth, creative, learning, buffer, communication.',
          },
          note: { type: 'string', maxLength: 240 },
        },
      },
    },
  },
}

// ── Internal helpers ─────────────────────────────────────────────────────────

const jsonResp = (data: unknown, status = 200, extra?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })

const errResp = (status: number, message: string, extra?: Record<string, string>) =>
  jsonResp({ message }, status, extra)

const parseCookies = (header: string | null): Record<string, string> => {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [name, ...val] = c.trim().split('=')
      return [name.trim(), decodeURIComponent(val.join('='))]
    }),
  )
}

const newSessionId = () =>
  globalThis.crypto?.randomUUID?.() ?? `pd-${Date.now()}-${Math.random().toString(36).slice(2)}`

const buildSystemPrompt = (locale: 'pl' | 'en') => {
  const lang = locale === 'pl' ? 'Polish' : 'English'
  return [
    `You are Producktive Day Architect. Always respond in ${lang}.`,
    'You only help with one job: proposing concrete time blocks for the user day plan.',
    'Do not chat broadly, teach productivity theory, discuss model details, or answer unrelated questions.',
    'If the user asks for something unrelated, redirect briefly to planning the day and propose useful time blocks.',
    'Analyze the current plan and recent conversation, then propose blocks the user can accept.',
    'Prefer append mode. Use merge mode only when fitting around existing blocks.',
    'Use minutes from midnight. 1440 is 00:00 tomorrow. Never go past 1800.',
    'Every block must be at least 15 minutes. Avoid overlaps unless the user explicitly asks for a conflict.',
    'Keep the reply concise: one or two short sentences max.',
    'Return only JSON matching the schema. No Markdown and no prose outside JSON.',
  ].join('\n')
}

const buildUserPayload = (data: z.infer<typeof requestSchema>, dailyLimit: number) =>
  JSON.stringify(
    {
      task: 'Propose time blocks for today.',
      userMessage: data.message,
      currentPlan: data.plan,
      recentConversation: data.history.slice(-6),
      rules: {
        dailyAgentLimitForUser: dailyLimit,
        minBlockDurationMinutes: MIN_BLOCK_DURATION_MINUTES,
        maxEndMinutes: MAX_DAY_END_MINUTES,
        maxBlocks: 8,
        allowedModes: ['append', 'merge'],
      },
    },
    null,
    2,
  )

const extractOpenAiText = (payload: unknown): string => {
  const p = payload as Record<string, unknown>
  if (typeof p?.output_text === 'string') return p.output_text
  const output = Array.isArray(p?.output) ? p.output : []
  for (const item of output) {
    const content = Array.isArray((item as any)?.content) ? (item as any).content : []
    const part = content.find((c: unknown) => typeof (c as any)?.text === 'string')
    if (part) return (part as any).text as string
  }
  return ''
}

const parseStructuredContent = (raw: string): unknown => {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('OpenAI response did not contain JSON.')
    return JSON.parse(match[0])
  }
}

const buildMockProposal = (locale: 'pl' | 'en') => {
  const pl = locale === 'pl'
  return {
    mode: 'append' as const,
    reply: pl
      ? 'Proponuje prosty zestaw blokow do dodania do dnia.'
      : 'I prepared a simple set of blocks for your day.',
    assumptions: [
      pl ? 'To jest tryb testowy bez wywolania OpenAI.' : 'This is test mode without calling OpenAI.',
      pl ? 'Kazdy blok ma minimum 15 minut.' : 'Every block is at least 15 minutes.',
    ],
    blocks: [
      {
        title: pl ? 'Najwazniejszy blok' : 'Most important block',
        startMinutes: 540,
        endMinutes: 600,
        priority: 'high' as const,
        category: 'deepFocus',
        note: pl ? 'Jedno konkretne zadanie bez rozpraszaczy.' : 'One concrete task without distractions.',
      },
      {
        title: pl ? 'Admin i wiadomosci' : 'Admin and messages',
        startMinutes: 780,
        endMinutes: 825,
        priority: 'medium' as const,
        category: 'admin',
        note: pl ? 'Zgrupowane drobne sprawy.' : 'Grouped small tasks.',
      },
    ],
    isMock: true,
  }
}

const callOpenAi = async (params: {
  apiKey: string
  model: string
  locale: 'pl' | 'en'
  userPayload: string
}): Promise<unknown> => {
  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      instructions: buildSystemPrompt(params.locale),
      input: params.userPayload,
      max_output_tokens: 1800,
      reasoning: { effort: 'low' },
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'producktive_day_agent',
          strict: true,
          schema: openAiJsonSchema,
        },
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    const status = res.status === 401 ? 500 : 502
    const message =
      res.status === 401 ? 'OpenAI API key is invalid or missing.' : 'OpenAI day agent request failed.'
    throw Object.assign(new Error(message), { status, detail })
  }

  return res.json()
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates a framework-agnostic HTTP handler for the Producktive Day AI agent.
 *
 * The returned function accepts a standard Web API `Request` and returns a
 * `Response`. It works with any runtime that supports the Fetch API:
 * Node 18+, Bun, Deno, Cloudflare Workers, and frameworks such as Nuxt,
 * Next.js App Router, or Hono.
 *
 * @example Nuxt server route (server/api/day-agent.post.ts)
 * ```ts
 * import { createDayAgentHandler } from '@producktive/day-widget/server'
 *
 * const handler = createDayAgentHandler({
 *   apiKey: () => useRuntimeConfig().openAiApiKey as string,
 *   model: () => useRuntimeConfig().openAiDayModel as string,
 *   mock: () => useRuntimeConfig().openAiDayMock === 'true',
 *   allowedOrigins: ['example.com'],
 * })
 *
 * export default defineEventHandler((event) => handler(toWebRequest(event)))
 * ```
 */
export function createDayAgentHandler(
  config: DayAgentConfig,
): (request: Request) => Promise<Response> {
  const dailyLimit = config.dailyLimit ?? DEFAULT_DAILY_LIMIT

  return async function handler(request: Request): Promise<Response> {
    // ── Origin check ───────────────────────────────────────
    if (config.allowedOrigins?.length) {
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')
      if (origin && host) {
        let originHost = ''
        try {
          originHost = new URL(origin).host
        } catch {
          // malformed origin — reject below
        }
        if (!new Set([host, ...config.allowedOrigins]).has(originHost)) {
          return errResp(403, 'Origin is not allowed for the day agent.')
        }
      }
    }

    // ── Parse body ─────────────────────────────────────────
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return errResp(400, 'Request body must be valid JSON.')
    }

    const parsed = requestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return errResp(400, 'Invalid day agent payload.')
    }

    const data = parsed.data
    const locale = data.locale

    // ── Session cookie + rate limit ────────────────────────
    const cookies = parseCookies(request.headers.get('cookie'))
    let sessionId = cookies['pd_day_session']
    let setCookieHeader: string | undefined

    if (!sessionId) {
      sessionId = newSessionId()
      const secure = !(request.headers.get('host') ?? '').includes('localhost') ? '; Secure' : ''
      setCookieHeader = `pd_day_session=${sessionId}; HttpOnly; SameSite=Lax; Max-Age=86400; Path=/${secure}`
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'local'
    const rateKey = `${ip}:${sessionId}:${data.plan.localDate}`
    const now = Date.now()
    const bucket = rateBuckets.get(rateKey)

    const rateLimitHeaders: Record<string, string> = {
      'x-producktive-agent-limit': String(dailyLimit),
    }
    if (setCookieHeader) rateLimitHeaders['Set-Cookie'] = setCookieHeader

    if (bucket && bucket.resetAt >= now && bucket.count >= dailyLimit) {
      rateLimitHeaders['x-producktive-agent-remaining'] = '0'
      return errResp(
        429,
        locale === 'pl'
          ? 'Limit agenta na dzisiaj zostal wykorzystany: 10 zapytan dziennie.'
          : 'The day agent limit has been reached: 10 requests per day.',
        rateLimitHeaders,
      )
    }

    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(rateKey, { count: 1, resetAt: now + RATE_WINDOW_MS })
    } else {
      bucket.count += 1
    }

    const remaining = dailyLimit - (rateBuckets.get(rateKey)?.count ?? 1)
    rateLimitHeaders['x-producktive-agent-remaining'] = String(Math.max(0, remaining))

    // ── Mock mode ──────────────────────────────────────────
    const isMock = typeof config.mock === 'function' ? config.mock() : (config.mock ?? false)
    if (isMock) {
      return jsonResp(buildMockProposal(locale), 200, rateLimitHeaders)
    }

    // ── OpenAI call ────────────────────────────────────────
    const apiKey =
      typeof config.apiKey === 'function' ? await config.apiKey() : config.apiKey
    if (!apiKey) {
      return errResp(500, 'OpenAI API key is not configured for the day agent.')
    }

    const model =
      typeof config.model === 'function'
        ? config.model() || DEFAULT_MODEL
        : (config.model ?? DEFAULT_MODEL)

    let openAiPayload: unknown
    try {
      openAiPayload = await callOpenAi({
        apiKey,
        model,
        locale,
        userPayload: buildUserPayload(data, dailyLimit),
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      return errResp(e.status ?? 502, e.message ?? 'OpenAI day agent request failed.', rateLimitHeaders)
    }

    const outputText = extractOpenAiText(openAiPayload)
    if (!outputText) {
      return errResp(502, 'OpenAI response did not contain structured output.', rateLimitHeaders)
    }

    try {
      const result = agentResponseSchema.parse(parseStructuredContent(outputText))
      return jsonResp(result, 200, rateLimitHeaders)
    } catch {
      return errResp(502, 'OpenAI response did not match expected schema.', rateLimitHeaders)
    }
  }
}
