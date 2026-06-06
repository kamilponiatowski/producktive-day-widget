# @producktive/day-widget

A self-contained React custom element (`<producktive-day>`) that renders a full-featured time-block day planner in any web page. Shipped as a single ES module — no framework required on the host side.

[![npm version](https://img.shields.io/npm/v/@producktive/day-widget)](https://www.npmjs.com/package/@producktive/day-widget)
[![license](https://img.shields.io/npm/l/@producktive/day-widget)](./LICENSE)

---

## Features

- Drag-and-drop timeline with 15-minute precision
- Create, edit, resize, and delete time blocks
- AI Day Architect — chat-based block proposals powered by OpenAI (server-side key, never exposed to the browser)
- Block library with reusable templates
- Productivity insights panel
- Persistent day plan via `localStorage`
- Fully localised (Polish + English built-in)
- Zero runtime dependencies beyond React 19

---

## Installation

```bash
npm install @producktive/day-widget
```

The package exports a single ES module. Import it once to register the custom element:

```js
import '@producktive/day-widget'
```

Or load the bundle directly in HTML:

```html
<script type="module" src="/widgets/producktive-day/producktive-day.js"></script>
```

---

## Usage

Place the custom element anywhere in your HTML:

```html
<producktive-day
  locale="en"
  api-base="/api/day-agent"
  storage-key="producktive.day.v1"
  start-hour="5"
  end-hour="23"
  step-minutes="15"
  theme="producktive"
></producktive-day>
```

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `locale` | `"pl"` \| `"en"` | `"pl"` | UI language |
| `api-base` | string | — | Endpoint URL for the AI day agent. Omit to disable the agent panel. |
| `storage-key` | string | `"producktive.day.v1"` | `localStorage` key prefix for the day plan |
| `start-hour` | `0`–`23` | `5` | First visible hour on the timeline |
| `end-hour` | `1`–`30` | `23` | Last visible hour. Values `0`–`6` represent the next calendar day (e.g. `0` = 00:00 tomorrow, `6` = 06:00 tomorrow) |
| `step-minutes` | `5` \| `10` \| `15` \| `30` | `15` | Snap grid interval in minutes |
| `theme` | string | `"producktive"` | CSS theme token (reserved for future theming) |

---

## Public API

Access the element's methods after it is defined:

```js
const el = document.querySelector('producktive-day')

// Wait for the element to initialise
el.addEventListener('producktive-day:ready', () => {
  const plan = el.getPlan()
  console.log(plan)
})
```

### Methods

| Method | Signature | Description |
|---|---|---|
| `getPlan()` | `() => DayPlan` | Returns the current day plan |
| `setPlan(plan)` | `(plan: DayPlan) => void` | Replaces the current plan (validated before applying) |
| `addBlocks(blocks)` | `(blocks: TimeBlock[]) => void` | Appends blocks to the current day |
| `clearPlan()` | `() => void` | Removes all blocks from the current day |

### Events

| Event | Detail | Description |
|---|---|---|
| `producktive-day:ready` | `{ plan: DayPlan }` | Fired once the widget is mounted and the plan is loaded |
| `producktive-day:change` | `{ plan: DayPlan }` | Fired whenever the plan changes |
| `producktive-day:error` | `{ message: string }` | Fired on unrecoverable widget errors |

---

## AI Day Agent

The widget includes an optional AI chat panel ("Day Architect"). It proposes concrete time blocks, shows a preview, and waits for explicit user approval before adding anything to the plan.

**The OpenAI API key never reaches the browser.** The widget sends only a controlled JSON payload to `api-base`. All key management, validation (Zod + Structured Outputs), and rate-limiting happen server-side.

### Server configuration (Nuxt / Node)

```env
OPENAI_API_KEY=sk-...
OPENAI_DAY_MODEL=gpt-5.4-nano
OPENAI_DAY_MOCK=
```

- `OPENAI_DAY_MODEL` is optional. Defaults to `gpt-5.4-nano` — a small, cost-efficient model well-suited to time-block planning.
- Set `OPENAI_DAY_MOCK=true` to enable a mock mode that returns a preset proposal without calling OpenAI. Useful for UI development.

### Rate limiting

The server endpoint enforces a limit of **10 requests per anonymous session per day**. The remaining count is shown in the widget UI so users understand the agent is a planning aid, not a general-purpose chat.

---

## Development

```bash
npm install
npm run dev        # start Vite dev server at http://localhost:5174
npm run typecheck  # TypeScript check only
npm run build      # typecheck + Vite library build → dist/
```

The build outputs a single file: `dist/producktive-day.js` (~200–600 KB depending on tree-shaking).

To test the bundle in isolation:

```bash
npm run build
npx serve .
# open http://localhost:3000 and check index.html
```

---

## Project structure

```
src/
  main.ts                    # Entry point — registers the custom element
  custom-element/
    defineProducktiveDay.ts  # customElements.define() wrapper
    ProducktiveDayElement.tsx
  domain/                    # Pure domain types and logic (no React)
    types.ts
    dayPlan.ts
    time.ts
    timeBlockPresets.ts
    timeBlockTemplates.ts
  i18n/
    messages.ts              # All UI strings (pl + en)
  storage/
    sessionDayPlanStorage.ts
    viewRangeStorage.ts
  styles/
    widget.css               # All widget styles (single CSS file, no CSS modules)
  ui/
    ProducktiveDayApp.tsx    # Root React component
    timeline/
      DayTimeline.tsx        # Main drag-and-drop timeline
      timelineInteractions.ts
    block-editor/
      BlockEditor.tsx        # Create / edit block modal
    agent-chat/
      AgentChat.tsx          # AI chat panel
    time-block-library/
      TimeBlockLibrary.tsx   # Reusable block templates sidebar
    insights/
      InsightsPanel.tsx      # Productivity insights
    primitives/
      TimeStepper.tsx
```

---

## Architecture principles

- React owns the widget and all interactions.
- The host application owns routing, SEO, i18n wrappers, and the server endpoint.
- `OPENAI_API_KEY` stays server-side and never reaches the widget bundle.
- The agent receives only the current day plan and a short conversation history — no persistent cross-day memory.
- Day state is browser-local (`localStorage`) and survives page refreshes and tab re-opens.
- Agent proposals are always shown as a preview first. Blocks are added only on explicit user action.
- The block library deduplicates templates by name. If multiple blocks share the same name, the tile uses the duration of the first rendered block.

---

## License

MIT
