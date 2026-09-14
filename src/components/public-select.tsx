import type { ReactNode } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import styles from "@/components/public-select.module.css";

type PublicSelectOption = { value: string; label: ReactNode };

type PublicSelectProps = {
  id?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  placeholder?: ReactNode;
  options: PublicSelectOption[];
  className?: string;
  onValueChange?: (value: string | null) => void;
};

export function PublicSelect({
  id,
  name,
  defaultValue,
  required,
  disabled,
  options,
  placeholder,
  className,
  onValueChange,
  ...ariaProps
}: PublicSelectProps) {
  return (
    <Select
      name={name}
      defaultValue={defaultValue || ""}
      required={required}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <SelectTrigger id={id} className={cn(styles.trigger, className)} {...ariaProps}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" className={styles.content}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem className={styles.item} key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
