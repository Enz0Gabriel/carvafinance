"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/shared/lib/api";

/** Query keys whose data depends on accounts, categories or transactions. */
export const FINANCE_KEYS = [
  "accounts",
  "categories",
  "transactions",
  "dashboard",
  "reports",
] as const;

export function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      FINANCE_KEYS.map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Algo deu errado. Tente novamente.";

type Resource = "accounts" | "categories";

/** CRUD hooks for a simple REST resource (`/api/<resource>`). */
export function createResourceHooks<TItem, TCreate, TUpdate>(
  resource: Resource,
  messages: { saved: string; archived: string; deleted: string },
) {
  function useList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return useQuery({
      queryKey: [resource, params],
      queryFn: () =>
        apiFetch<TItem[]>(`/api/${resource}${query ? `?${query}` : ""}`),
    });
  }

  function useSave() {
    const invalidate = useInvalidateFinance();
    return useMutation({
      mutationFn: ({ id, data }: { id?: string; data: TCreate | TUpdate }) =>
        apiFetch<TItem>(id ? `/api/${resource}/${id}` : `/api/${resource}`, {
          method: id ? "PATCH" : "POST",
          json: data,
        }),
      onSuccess: () => {
        toast.success(messages.saved);
        return invalidate();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  function useRemove() {
    const invalidate = useInvalidateFinance();
    return useMutation({
      mutationFn: (id: string) =>
        apiFetch<{ result: "deleted" | "archived" }>(`/api/${resource}/${id}`, {
          method: "DELETE",
        }),
      onSuccess: ({ result }) => {
        toast.success(
          result === "archived" ? messages.archived : messages.deleted,
        );
        return invalidate();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return { useList, useSave, useRemove };
}
