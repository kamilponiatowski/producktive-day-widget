export type Locale = 'pl' | 'en'
export type Priority = 'low' | 'medium' | 'high'
export type BlockSource = 'manual' | 'agent'
export type ApplyMode = 'append' | 'merge'

export type TimeBlock = {
  id: string
  title: string
  startMinutes: number
  endMinutes: number
  priority: Priority
  category: string
  colorToken: string
  note: string
  source: BlockSource
  createdAt: string
  updatedAt: string
}

export type TimeBlockTemplate = {
  key: string
  title: string
  durationMinutes: number
  priority: Priority
  category: string
  colorToken: string
  note: string
}

export type DayPlan = {
  schemaVersion: 1
  localDate: string
  timezone: string
  blocks: TimeBlock[]
}

export type AgentBlockProposal = {
  title: string
  startMinutes: number
  endMinutes: number
  priority: Priority
  category: string
  note: string
}

export type AgentProposal = {
  mode: ApplyMode
  reply: string
  assumptions: string[]
  blocks: AgentBlockProposal[]
  isMock?: boolean
}

export type AgentChatMessage = {
  role: 'user' | 'assistant'
  content: string
}
