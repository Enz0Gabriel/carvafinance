import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Whitelisted icons a category may use (stored by name). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  house: House,
  car: Car,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  "shopping-bag": ShoppingBag,
  tag: Tag,
  briefcase: Briefcase,
  laptop: Laptop,
  "trending-up": TrendingUp,
  "shopping-cart": ShoppingCart,
  coffee: Coffee,
  fuel: Fuel,
  plane: Plane,
  gift: Gift,
  shirt: Shirt,
  smartphone: Smartphone,
  wifi: Wifi,
  zap: Zap,
  receipt: Receipt,
  "paw-print": PawPrint,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  wrench: Wrench,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
};

type CategoryIconProps = { name: string; color?: string; className?: string };

/** Category icon in a tinted circle; unknown names fall back to a tag. */
export function CategoryIcon({ name, color, className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[name] ?? Tag;
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{ backgroundColor: color ? `${color}22` : undefined, color }}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
