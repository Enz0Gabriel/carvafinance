"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  CATEGORY_ICONS,
  CategoryIcon,
} from "@/shared/components/category-icon";
import { ColorPicker, COLOR_OPTIONS } from "@/shared/components/color-picker";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import {
  categoryCreateSchema,
  type CategoryCreateInput,
  type CategoryDTO,
  type CategoryKind,
} from "../schemas";

const NO_PARENT = "__none__";

type CategoryFormProps = {
  kind: CategoryKind;
  category?: CategoryDTO;
  /** Top-level categories of the same kind available as parents. */
  parents: CategoryDTO[];
  pending?: boolean;
  onSubmit: (data: CategoryCreateInput) => void;
};

export function CategoryForm({
  kind,
  category,
  parents,
  pending,
  onSubmit,
}: CategoryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryCreateInput>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: {
      name: category?.name ?? "",
      kind,
      color: category?.color ?? COLOR_OPTIONS[0],
      icon: category?.icon ?? "tag",
      parentId: category?.parentId ?? null,
    },
  });

  const parentOptions = parents.filter(
    (p) => p.kind === kind && !p.parentId && p.id !== category?.id,
  );
  // A category that already has children cannot become a child itself.
  const canHaveParent = !category?.children.length;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Nome</Label>
        <Input
          id="category-name"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      {canHaveParent && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-parent">Categoria pai (opcional)</Label>
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <Select
                value={field.value ?? NO_PARENT}
                onValueChange={(value) =>
                  field.onChange(value === NO_PARENT ? null : value)
                }
              >
                <SelectTrigger id="category-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Nenhuma</SelectItem>
                  {parentOptions.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Ícone</Label>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-label="Ícone"
              className="flex flex-wrap gap-1"
            >
              {Object.keys(CATEGORY_ICONS).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={field.value === name}
                  aria-label={name}
                  onClick={() => field.onChange(name)}
                  className={cn(
                    "rounded-full p-0.5 outline-none focus-visible:ring-2",
                    field.value === name && "ring-primary ring-2",
                  )}
                >
                  <CategoryIcon name={name} />
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor</Label>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ColorPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar categoria"}
      </Button>
    </form>
  );
}
