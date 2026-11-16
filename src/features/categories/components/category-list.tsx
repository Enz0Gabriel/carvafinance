"use client";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/shared/components/category-icon";
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { ErrorState } from "@/shared/components/feedback/error-state";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  useCategories,
  useDeleteCategory,
  useSaveCategory,
} from "../hooks/use-categories";
import type { CategoryDTO, CategoryKind } from "../schemas";
import { CategoryForm } from "./category-form";

function CategoryRow({
  category,
  onEdit,
  onDelete,
  nested = false,
}: {
  category: CategoryDTO;
  onEdit: (c: CategoryDTO) => void;
  onDelete: (c: CategoryDTO) => void;
  nested?: boolean;
}) {
  return (
    <div
      className={
        nested
          ? "flex items-center gap-3 py-2 pl-11"
          : "flex items-center gap-3 py-2"
      }
    >
      <CategoryIcon name={category.icon} color={category.color} />
      <span className="flex-1 truncate text-sm font-medium">
        {category.name}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Editar ${category.name}`}
        onClick={() => onEdit(category)}
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Excluir ${category.name}`}
        onClick={() => onDelete(category)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

export function CategoryList() {
  const [kind, setKind] = useState<CategoryKind>("EXPENSE");
  const { data, isPending, isError, refetch } = useCategories({ kind });
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground text-sm">
            Organize receitas e despesas.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden />
          Nova categoria
        </Button>
      </div>

      <Tabs
        value={kind}
        onValueChange={(value) => setKind(value as CategoryKind)}
      >
        <TabsList>
          <TabsTrigger value="EXPENSE">Despesas</TabsTrigger>
          <TabsTrigger value="INCOME">Receitas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          action={
            <Button onClick={() => setEditing("new")}>Criar categoria</Button>
          }
        />
      ) : (
        <div className="bg-card divide-y rounded-xl border px-4">
          {data.map((category) => (
            <div key={category.id}>
              <CategoryRow
                category={category}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
              {category.children.map((child) => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  nested
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Nova categoria" : "Editar categoria"}
            </DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <CategoryForm
              kind={editing === "new" ? kind : editing.kind}
              category={editing === "new" ? undefined : editing}
              parents={data ?? []}
              pending={save.isPending}
              onSubmit={(values) =>
                save.mutate(
                  {
                    id: editing === "new" ? undefined : editing.id,
                    data: values,
                  },
                  { onSuccess: () => setEditing(null) },
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir "${deleting?.name}"?`}
        description="Se a categoria tiver lançamentos, ela será arquivada. Subcategorias passam a ser categorias principais."
        confirmLabel="Excluir"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
