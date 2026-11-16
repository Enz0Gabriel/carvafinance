import { z } from "zod";

export const CATEGORY_KINDS = ["INCOME", "EXPENSE"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome")
    .max(40, "Use até 40 caracteres"),
  kind: z.enum(CATEGORY_KINDS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  icon: z.string().min(1).max(40),
  parentId: z.string().min(1).nullable().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .extend({ archived: z.boolean().optional() });

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export type CategoryDTO = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  archived: boolean;
  parentId: string | null;
  children: CategoryDTO[];
};
