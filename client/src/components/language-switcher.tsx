import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/context/language-context";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { isEnglish, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span
        className={`text-xs font-semibold transition-colors ${
          !isEnglish ? "text-whiskey" : "text-gray-400"
        }`}
      >
        GR
      </span>
      <Switch
        checked={isEnglish}
        onCheckedChange={(checked) => setLanguage(checked ? "en" : "el")}
        aria-label={isEnglish ? "Switch to Greek" : "Αλλαγή σε Αγγλικά"}
        className="data-[state=unchecked]:bg-steel data-[state=unchecked]:border-steel data-[state=checked]:bg-whiskey"
      />
      <span
        className={`text-xs font-semibold transition-colors ${
          isEnglish ? "text-whiskey" : "text-gray-400"
        }`}
      >
        EN
      </span>
    </div>
  );
}
