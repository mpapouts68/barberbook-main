import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, User, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import eortologioImg from "@assets/EORTOLOGIO.png";
import { useLanguage } from "@/context/language-context";

export default function NamedayPanel() {
  const { isEnglish } = useLanguage();
  const { data: todaysNamedays = [], isLoading } = useQuery({
    queryKey: ["/api/nameday/today"],
  });

  const text = {
    title: isEnglish ? "TODAY'S NAME DAYS" : "ΣΗΜΕΡΙΝΕΣ ΓΙΟΡΤΕΣ ΟΝΟΜΑΤΟΣ",
    offerBadge: isEnglish ? "Special Offer!" : "Ειδική Προσφορά!",
    offerTitle: isEnglish ? "Special Offer for Name Days!" : "🎉 Ειδική Προσφορά για Γιορτές Ονόματος!",
    celebratingToday: isEnglish ? "Celebrating today" : "Γιορτάζουν σήμερα",
    discount: isEnglish ? "20% OFF" : "20% ΕΚΠΤΩΣΗ",
    bookDiscount: isEnglish ? "Book Appointment with Discount" : "Κλείσε Ραντεβού με Έκπτωση",
    noNamedays: isEnglish ? "No celebrations today" : "Δεν υπάρχουν γιορτές σήμερα",
    checkTomorrow: isEnglish ? "Check again tomorrow for special offers!" : "Ελέγξτε ξανά αύριο για ειδικές προσφορές!",
  };

  if (isLoading) {
    return (
      <Card
        className="relative border-steel mb-8 overflow-hidden min-h-[200px]"
        style={{
          backgroundImage: `url(${eortologioImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-charcoal/85 z-0" aria-hidden />
        <CardContent className="relative z-10 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-steel rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-16 bg-steel rounded"></div>
              <div className="h-16 bg-steel rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="relative border-steel mb-8 overflow-hidden"
      style={{
        backgroundImage: `url(${eortologioImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-charcoal/85 z-0" aria-hidden />
      <CardContent className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-oswald text-2xl font-bold text-whiskey flex items-center [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
            <CalendarDays className="text-whiskey mr-3" size={24} />
            {text.title}
          </h3>
          {Array.isArray(todaysNamedays) && todaysNamedays.length > 0 && (
            <div className="flex items-center gap-2">
              <Gift className="text-whiskey" size={20} />
              <span className="text-whiskey font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{text.offerBadge}</span>
            </div>
          )}
        </div>
        
        {Array.isArray(todaysNamedays) && todaysNamedays.length > 0 ? (
          <>
            <div className="mb-4 p-4 bg-emerald-600/20 border border-emerald-600/50 rounded-lg">
              <p className="text-white font-semibold mb-2">
                {text.offerTitle}
              </p>
              <p className="text-gray-300 text-sm">
                {isEnglish ? (
                  <>
                    If you're celebrating today (name day or birthday), enjoy <strong className="text-emerald-400">20% off</strong> any service!
                  </>
                ) : (
                  <>
                    Αν γιορτάζεις σήμερα (ονομαστική ή γενέθλια), απολαύστε <strong className="text-emerald-400">20% έκπτωση</strong> σε οποιαδήποτε υπηρεσία!
                  </>
                )}
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              {todaysNamedays.map((name: string, index: number) => (
                <div key={index} className="flex items-center justify-between bg-charcoal rounded-lg p-4 hover:bg-slate/20 transition-colors">
                  <div className="flex items-center">
                    <div className="w-10 h-10 whiskey-gradient rounded-full flex items-center justify-center mr-3">
                      <User className="text-black" size={20} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{name}</p>
                      <p className="text-gray-200 text-sm">{text.celebratingToday}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {text.discount}
                  </div>
                </div>
              ))}
            </div>
            
            <Link href="/booking">
              <Button className="w-full whiskey-gradient hover:opacity-90 text-black font-semibold">
                <Gift className="w-4 h-4 mr-2" />
                {text.bookDiscount}
              </Button>
            </Link>
          </>
        ) : (
          <div className="text-center py-8">
            <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-70" />
            <p className="text-gray-200 mb-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{text.noNamedays}</p>
            <p className="text-gray-300 text-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
              {text.checkTomorrow}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
