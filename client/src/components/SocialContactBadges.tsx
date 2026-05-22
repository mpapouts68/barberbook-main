import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaInstagram, FaFacebook } from "react-icons/fa";
import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import { contactLinks } from "@/lib/branding";
import { useLanguage } from "@/context/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CompanyInfo = {
  phone?: string | null;
  address?: string | null;
};

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

const badgeClass =
  "inline-flex items-center justify-center w-10 h-10 rounded-full border border-steel/80 bg-charcoal/80 text-whiskey hover:bg-whiskey hover:text-black hover:border-whiskey transition-all duration-200 shadow-sm";

function ContactBadge({
  href,
  label,
  icon,
  external = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      title={label}
      aria-label={label}
      className={badgeClass}
    >
      {icon}
    </a>
  );
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

  const phones =
    contactLinks.phones.length > 0
      ? contactLinks.phones
      : company?.phone
        ? [company.phone]
        : [];
  const address = contactLinks.address || company?.address || "";
  const mapsHref = contactLinks.mapsUrl;
  const email = contactLinks.email;

  const phoneLabel = isEnglish ? "Phone numbers" : "Τηλέφωνα";
  const emailLabel = isEnglish ? "Email" : "Email";
  const locationLabel = isEnglish ? "Open in Google Maps" : "Άνοιγμα στο Google Maps";

  const hasAny =
    contactLinks.instagram ||
    contactLinks.facebook ||
    email ||
    address ||
    phones.length > 0;

  if (!hasAny) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {contactLinks.instagram && (
        <ContactBadge
          href={contactLinks.instagram}
          label="Instagram"
          icon={<FaInstagram className="w-4 h-4" />}
          external
        />
      )}
      {contactLinks.facebook && (
        <ContactBadge
          href={contactLinks.facebook}
          label="Facebook"
          icon={<FaFacebook className="w-4 h-4" />}
          external
        />
      )}
      {email && (
        <ContactBadge
          href={`mailto:${email}`}
          label={emailLabel}
          icon={<Mail className="w-4 h-4" />}
        />
      )}
      {address && (
        <ContactBadge
          href={mapsHref}
          label={locationLabel}
          icon={<MapPin className="w-4 h-4" />}
          external
        />
      )}
      {phones.length === 1 && (
        <ContactBadge
          href={telHref(phones[0])}
          label={phoneLabel}
          icon={<Phone className="w-4 h-4" />}
        />
      )}
      {phones.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={phoneLabel}
              aria-label={phoneLabel}
              className={`${badgeClass} gap-0.5 px-2 w-auto min-w-[2.5rem]`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="bg-charcoal border-steel text-white min-w-[12rem]"
          >
            {phones.map((phone) => (
              <DropdownMenuItem key={phone} asChild>
                <a
                  href={telHref(phone)}
                  className="cursor-pointer font-mono text-sm focus:bg-steel focus:text-white"
                >
                  {phone}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
