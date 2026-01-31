import { cn } from "../../lib/utils";

export type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
};

export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div className="flex rounded-full border border-ink-200 bg-white p-1">
      {items.map((item) => (
        <button
          key={item.value}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            value === item.value
              ? "bg-ink-900 text-ink-50"
              : "text-ink-700 hover:bg-ink-100"
          )}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
