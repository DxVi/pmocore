import { z } from 'zod';
import { RecordRefSchema } from './common.js';

/** Compact record search used by relationship pickers (design §7.2). */
export const LOOKUP_TYPES = [
  'work-item',
  'requirement',
  'activity',
  'raid-item',
  'test',
  'defect',
  'release',
  'document',
] as const;

export type LookupType = (typeof LOOKUP_TYPES)[number];

export const LookupQuerySchema = z.object({
  type: z.enum(LOOKUP_TYPES),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const LookupResultSchema = z.array(RecordRefSchema);

export type LookupQuery = z.infer<typeof LookupQuerySchema>;
export type LookupResult = z.infer<typeof LookupResultSchema>;
