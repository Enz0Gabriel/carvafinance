"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { authClient } from "@/shared/lib/auth-client";
import { DEMO_CREDENTIALS } from "../demo";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function signIn(credentials: LoginInput) {
    setPending(true);
    const { error } = await authClient.signIn.email(credentials);
    setPending(false);
    if (error) {
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(signIn)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-destructive text-sm">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-destructive text-sm">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => signIn({ ...DEMO_CREDENTIALS })}
      >
        Entrar como demo
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        Não tem conta?{" "}
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
