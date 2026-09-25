import { boolean, index, integer, pgTable, text, unique } from 'drizzle-orm/pg-core';

export const referenceValues = pgTable(
  'reference_values',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    category: text('category').notNull(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull(),
    semantic: text('semantic'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [
    unique('reference_values_category_code_key').on(t.category, t.code),
    index('reference_values_category_sort_idx').on(t.category, t.sortOrder),
  ],
);
