"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { authClient } from "@/shared/lib/auth-client";
import { registerSchema, type RegisterInput } from "../schemas";

const FIELDS: {
  name: FieldPath<RegisterInput>;
  label: string;
  type: string;
  autoComplete: string;
}[] = [
  { name: "name", label: "Nome", type: "text", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  {
    name: "password",
    label: "Senha",
    type: "password",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirmar senha",
    type: "password",
    autoComplete: "new-password",
  },
];

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit({ name, email, password }: RegisterInput) {
    setPending(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (error) {
      toast.error(
        error.code === "USER_ALREADY_EXISTS" ||
          error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {FIELDS.map(({ name, label, type, autoComplete }) => {
        const message = errors[name]?.message;
        return (
          <div key={name} className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              type={type}
              autoComplete={autoComplete}
              aria-invalid={!!message}
              aria-describedby={message ? `${name}-error` : undefined}
              {...register(name)}
            />
            {message && (
              <p id={`${name}-error`} className="text-destructive text-sm">
                {message}
              </p>
            )}
          </div>
        );
      })}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
