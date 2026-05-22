import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaInstagram, FaFacebook } from "react-icons/fa";
import { MapPin, Phone } from "lucide-react";
import { contactLinks } from "@/lib/branding";
import { useLanguage } from "@/context/language-context";

type CompanyInfo = {
  phone?: string | null;
  address?: string | null;
};

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function SocialContactBadges({ className = "" }: { className?: string }) {
  const { isEnglish } = useLanguage();

  const { data: company } = useQuery<CompanyInfo>({
    queryKey: ["/api/company"],
    queryFn: async () => {
      const res = await fetch("/api/company");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const phone = contactLinks.phone || company?.phone || "";
  const address = contactLinks.address || company?.address || "";
  const instagram = contactLinks.instagram;
  const facebook = contactLinks.facebook;

  const items: {
    key: string;
    href: string;
    label: string;
    icon: ReactNode;
    external?: boolean;
  }[] = [];

  if (instagram) {
    items.push({
      key: "instagram",
      href: instagram,
      label: "Instagram",
      icon: <FaInstagram className="w-4 h-4" />,
      external: true,
    });
  }
  if (facebook) {
    items.push({
      key: "facebook",
      href: facebook,
      label: "Facebook",
      icon: <FaFacebook className="w-4 h-4" />,
      external: true,
    });
  }
  if (address) {
    items.push({
      key: "location",
      href: contactLinks.mapsUrl || mapsHref(address),
      label: isEnglish ? "Location" : "Τοποθεσία",
      icon: <MapPin className="w-4 h-4" />,
      external: true,
    });
  }
  if (phone) {
    items.push({
      key: "phone",
      href: telHref(phone),
      label: isEnglish ? "Call" : "Τηλέφωνο",
      icon: <Phone className="w-4 h-4" />,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          title={item.label}
          aria-label={item.label}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-steel/80 bg-charcoal/80 text-whiskey hover:bg-whiskey hover:text-black hover:border-whiskey transition-all duration-200 shadow-sm"
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
