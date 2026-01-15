import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCENT_COLORS, useAccentColor } from "@/hooks/use-accent-color";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

export function ColorPicker() {
  const { accentColor, setAccentColor } = useAccentColor();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Palette className="h-5 w-5" />
        <span
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-background"
          style={{ backgroundColor: accentColor.value }}
        />
        <span className="sr-only">Change accent color</span>
      </Button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border bg-card p-3 shadow-lg"
        >
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Accent Color
          </p>
          <div className="grid grid-cols-5 gap-2">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  setAccentColor(color);
                  setIsOpen(false);
                }}
                className={cn(
                  "h-8 w-8 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                  accentColor.name === color.name && "ring-2 ring-offset-2 ring-offset-background"
                )}
                style={{
                  backgroundColor: color.value,
                  boxShadow: accentColor.name === color.name ? `0 0 0 2px var(--color-background), 0 0 0 4px ${color.value}` : undefined,
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
