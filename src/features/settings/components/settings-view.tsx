"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { THEME_OPTIONS } from "@/shared/components/layout/theme-toggle";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import { authClient } from "@/shared/lib/auth-client";
import { useTheme } from "next-themes";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) return toast.error("Informe seu nome.");
    setPending(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setPending(false);
    if (error) return toast.error("Não foi possível salvar o perfil.");
    toast.success("Perfil atualizado");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Nome</Label>
        <Input
          id="profile-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}

const EMPTY_PASSWORDS = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};
type PasswordField = keyof typeof EMPTY_PASSWORDS;

const PASSWORD_FIELDS: {
  name: PasswordField;
  label: string;
  autoComplete: string;
}[] = [
  {
    name: "currentPassword",
    label: "Senha atual",
    autoComplete: "current-password",
  },
  { name: "newPassword", label: "Nova senha", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Confirmar nova senha",
    autoComplete: "new-password",
  },
];

function ChangePasswordForm() {
  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>(
    {},
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = passwordSchema.safeParse(values);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) return toast.error("Senha atual incorreta.");
    setValues(EMPTY_PASSWORDS);
    toast.success("Senha alterada");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 sm:max-w-sm"
      noValidate
    >
      {PASSWORD_FIELDS.map(({ name, label, autoComplete }) => (
        <div key={name} className="flex flex-col gap-2">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            type="password"
            autoComplete={autoComplete}
            value={values[name]}
            aria-invalid={!!errors[name]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [name]: e.target.value }))
            }
          />
          {errors[name] && (
            <p className="text-destructive text-sm">{errors[name]}</p>
          )}
        </div>
      ))}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  );
}

function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={theme}
      onValueChange={(v) => v && setTheme(v)}
      aria-label="Tema"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value} className="gap-2 px-4">
          <Icon className="size-4" aria-hidden />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function SettingsView({ name }: { name: string }) {
  const sections = [
    {
      title: "Perfil",
      description: "Como você aparece no sistema.",
      content: <ProfileForm name={name} />,
    },
    {
      title: "Segurança",
      description: "Ao alterar a senha, outras sessões são encerradas.",
      content: <ChangePasswordForm />,
    },
    {
      title: "Aparência",
      description: "Escolha o tema da interface.",
      content: <ThemeSetting />,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>{section.content}</CardContent>
        </Card>
      ))}
    </div>
  );
}
