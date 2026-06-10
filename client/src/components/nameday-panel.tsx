import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, User, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import eortologioImg from "@assets/EORTOLOGIO.png";
import { useLanguage } from "@/context/language-context";

const COMPACT_NAME_LIMIT = 5;

export default function NamedayPanel({ compact = false }: { compact?: boolean }) {
  const { isEnglish } = useLanguage();
  const { data: todaysNamedays = [], isLoading } = useQuery({
    queryKey: ["/api/nameday/today"],
  });

  const text = {
    title: isEnglish ? "TODAY'S NAME DAYS" : "ΣΗΜΕΡΙΝΕΣ ΓΙΟΡΤΕΣ",
    offerBadge: isEnglish ? "20% off" : "20% έκπτωση",
    offerShort: isEnglish
      ? "Name day or birthday today? Enjoy 20% off any service."
      : "Ονομαστική ή γενέθλια σήμερα; 20% έκπτωση σε κάθε υπηρεσία.",
    celebratingToday: isEnglish ? "Today" : "Σήμερα",
    bookDiscount: isEnglish ? "Book with discount" : "Κλείσε με έκπτωση",
    noNamedays: isEnglish ? "No celebrations today" : "Δεν υπάρχουν γιορτές σήμερα",
    andMore: (n: number) =>
      isEnglish ? `+${n} more` : `+${n} ακόμα`,
  };

  const names = Array.isArray(todaysNamedays) ? todaysNamedays : [];
  const visibleNames = compact ? names.slice(0, COMPACT_NAME_LIMIT) : names;
  const hiddenCount = compact ? Math.max(0, names.length - COMPACT_NAME_LIMIT) : 0;

  const cardClass = compact
    ? "relative border-steel overflow-hidden h-full flex flex-col"
    : "relative border-steel mb-8 overflow-hidden";

  if (isLoading) {
    return (
      <Card
        className={`${cardClass} min-h-[200px]`}
        style={{
          backgroundImage: `url(${eortologioImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-charcoal/85 z-0" aria-hidden />
        <CardContent className="relative z-10 p-5">
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-steel rounded w-2/3" />
            <div className="h-12 bg-steel rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cardClass}
      style={{
        backgroundImage: `url(${eortologioImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-charcoal/85 z-0" aria-hidden />
      <CardContent className={`relative z-10 flex flex-col min-h-0 ${compact ? "p-5 h-full" : "p-6"}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3
            className={`font-oswald font-bold text-whiskey flex items-center [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] ${
              compact ? "text-lg" : "text-2xl"
            }`}
          >
            <CalendarDays className="text-whiskey mr-2 shrink-0" size={compact ? 20 : 24} />
            {text.title}
          </h3>
          {names.length > 0 && (
            <span className="text-emerald-400 text-xs font-semibold whitespace-nowrap flex items-center gap-1">
              <Gift size={14} />
              {text.offerBadge}
            </span>
          )}
        </div>

        {names.length > 0 ? (
          <>
            <p className="text-gray-300 text-xs mb-3 leading-relaxed">{text.offerShort}</p>

            <div
              className={`space-y-1.5 mb-3 ${compact ? "flex-1 min-h-0 overflow-y-auto max-h-40" : "space-y-2 mb-4"}`}
            >
              {visibleNames.map((name: string, index: number) => (
                <div
                  key={`${name}-${index}`}
                  className="flex items-center gap-2 bg-charcoal/80 rounded-lg px-3 py-2"
                >
                  <div className="w-8 h-8 whiskey-gradient rounded-full flex items-center justify-center shrink-0">
                    <User className="text-black" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm truncate">{name}</p>
                    <p className="text-gray-400 text-xs">{text.celebratingToday}</p>
                  </div>
                </div>
              ))}
              {hiddenCount > 0 && (
                <p className="text-center text-gray-400 text-xs py-1">{text.andMore(hiddenCount)}</p>
              )}
            </div>

            <Link href="/booking">
              <Button
                size={compact ? "sm" : "default"}
                className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold"
              >
                <Gift className="w-4 h-4 mr-2" />
                {text.bookDiscount}
              </Button>
            </Link>
          </>
        ) : (
          <div className={`text-center ${compact ? "py-6" : "py-8"}`}>
            <Gift className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-70" />
            <p className="text-gray-200 text-sm">{text.noNamedays}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
