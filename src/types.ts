export const generatorTypes = ['auto', 'firstName', 'lastName', 'fullName', 'email', 'username', 'password', 'phone', 'company', 'street', 'city', 'state', 'country', 'postalCode', 'url', 'text', 'number', 'date', 'digits', 'pattern', 'fixed'] as const;
export type GeneratorType = typeof generatorTypes[number];
export type Locale = 'en' | 'en_IN';
export type Action = 'page' | 'form' | 'field' | 'pick' | 'undo';
export interface Rule {
  id: string;
  matchType: 'selector' | 'name' | 'label';
  match: string;
  generator: GeneratorType;
  value: string;
  min?: number;
  max?: number;
}
export interface Profile { id: string; name: string; urlPattern: string; enabled: boolean; rules: Rule[] }
export interface Settings { version: 1; locale: Locale; overwrite: boolean; seed: string; rules: Rule[]; profiles: Profile[]; pausedOrigins: string[] }
export interface FillResult { filled: number; skipped: number; issues: string[]; message?: string }
export interface RunRequest { kind: 'run'; action: Action; overwrite?: boolean; seed?: string }
export interface ContentRequest { kind: 'fill'; action: Action; settings: Settings; contextMenu?: boolean; targetElementId?: number }
export interface RunResponse { ok: boolean; result?: FillResult; error?: string }
