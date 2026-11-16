"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, toQuery } from "@/shared/lib/api";
import {
  errorMessage,
  useInvalidateFinance,
} from "@/shared/hooks/use-resource";
import type { Paginated, TransactionDTO, TransactionInput } from "../schemas";

export type TransactionQuery = Record<string, string | number | undefined>;

export function useTransactions(params: TransactionQuery) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () =>
      apiFetch<Paginated<TransactionDTO>>(
        `/api/transactions${toQuery(params)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useSaveTransaction() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: TransactionInput }) =>
      apiFetch<TransactionDTO>(
        id ? `/api/transactions/${id}` : "/api/transactions",
        {
          method: id ? "PATCH" : "POST",
          json: data,
        },
      ),
    onSuccess: () => {
      toast.success("Lançamento salvo");
      return invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

type ListSnapshot = [
  readonly unknown[],
  Paginated<TransactionDTO> | undefined,
][];

/** Deletes optimistically: the row disappears at once and comes back if the server fails. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/transactions/${id}`, { method: "DELETE" }),
    onMutate: async (id): Promise<{ snapshot: ListSnapshot }> => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const snapshot = queryClient.getQueriesData<Paginated<TransactionDTO>>({
        queryKey: ["transactions"],
      });
      queryClient.setQueriesData<Paginated<TransactionDTO>>(
        { queryKey: ["transactions"] },
        (page) =>
          page && {
            ...page,
            items: page.items.filter((item) => item.id !== id),
            total: Math.max(0, page.total - 1),
          },
      );
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      toast.error("Não foi possível excluir o lançamento.");
    },
    onSuccess: () => toast.success("Lançamento excluído"),
    onSettled: () => invalidate(),
  });
}
