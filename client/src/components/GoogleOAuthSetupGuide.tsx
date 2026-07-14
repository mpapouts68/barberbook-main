import { CheckCircle, Info, Key } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/context/branding-context";
import { getBrandingFullName } from "@shared/brandingDefaults";

const linkClass = "text-blue-600 underline font-semibold";

type Lang = "el" | "en";

interface GoogleOAuthSetupGuideProps {
  language: Lang;
  baseUrl: string;
  devOrigin?: string;
}

export function GoogleOAuthSetupGuide({
  language,
  baseUrl,
  devOrigin = "http://localhost:5100",
}: GoogleOAuthSetupGuideProps) {
  const { toast } = useToast();
  const { branding } = useBranding();
  const brandFullName = getBrandingFullName(branding, language === "en");
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/google/callback`;
  const isEl = language === "el";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: isEl ? "Αντιγράφηκε" : "Copied",
      description: label,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <p className="text-xs text-muted-foreground">
        {isEl ? "Ενημέρωση: Μάιος 2026 · " : "Updated: May 2026 · "}
        <a
          href="https://developers.google.com/identity/protocols/oauth2/web-server"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Google OAuth 2.0 (Web server)
        </a>
      </p>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="space-y-1 text-sm">
          <p>
            {isEl
              ? `Το «Σύνδεση με Google» χρησιμοποιεί OAuth Client ID (όχι service account). Διαφορετικό από το Google Calendar.`
              : `“Sign in with Google” uses an OAuth Client ID (not a service account). Separate from Google Calendar.`}
          </p>
          <p>
            {isEl
              ? `Δεν χρειάζεται να ενεργοποιήσετε Google+ API — αρκούν scopes email/profile.`
              : `You do not need Google+ API — email/profile scopes are enough.`}
          </p>
        </AlertDescription>
      </Alert>

      <GuideStep
        n={1}
        title={isEl ? "Project στο Google Cloud" : "Google Cloud project"}
        color="blue"
      >
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className={linkClass}>
              Google Cloud Console
            </a>
          </li>
          <li>{isEl ? "Νέο project π.χ. barberbook-oauth ή χρήση υπάρχοντος" : "New project e.g. barberbook-oauth or use existing"}</li>
        </ol>
      </GuideStep>

      <GuideStep
        n={2}
        title={isEl ? "OAuth consent screen (Google Auth platform)" : "OAuth consent screen (Google Auth platform)"}
        color="purple"
      >
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>
            ☰ → <strong>Google Auth platform</strong> →{" "}
            <a
              href="https://console.cloud.google.com/auth/branding"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Branding
            </a>{" "}
            /{" "}
            <a
              href="https://console.cloud.google.com/auth/audience"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Audience
            </a>
          </li>
          <li>{isEl ? "User type: External (για δημόσιο login)" : "User type: External (public login)"}</li>
          <li>
            {isEl ? "App name:" : "App name:"}{" "}
            <code className="bg-purple-100 dark:bg-purple-900/40 px-1 rounded">{brandFullName}</code>
          </li>
          <li>{isEl ? "Support & developer email: το Gmail σας" : "Support & developer email: your Gmail"}</li>
          <li>
            <strong>Scopes:</strong>{" "}
            <code className="text-xs">openid</code>,{" "}
            <code className="text-xs">email</code>,{" "}
            <code className="text-xs">profile</code>{" "}
            (
            <code className="text-xs">.../auth/userinfo.email</code>,{" "}
            <code className="text-xs">.../auth/userinfo.profile</code>)
          </li>
          <li>
            {isEl
              ? "Αν η εφαρμογή είναι σε Testing: προσθέστε test users στο Audience"
              : "If app is in Testing: add test users under Audience"}
          </li>
        </ol>
      </GuideStep>

      <GuideStep
        n={3}
        title={isEl ? "OAuth Client ID (Web application)" : "OAuth Client ID (Web application)"}
        color="orange"
      >
        <ol className="list-decimal list-inside space-y-2 mt-2">
          <li>
            ☰ → <strong>Google Auth platform</strong> →{" "}
            <a
              href="https://console.cloud.google.com/auth/clients"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Clients
            </a>{" "}
            → <strong>Create client</strong> → <strong>Web application</strong>
          </li>
          <li>
            <strong>{isEl ? "Authorized JavaScript origins" : "Authorized JavaScript origins"}:</strong>
            <UriRow value={devOrigin} onCopy={() => copy(devOrigin, "Origin")} />
            {baseUrl.startsWith("https://") && baseUrl !== devOrigin && (
              <UriRow value={baseUrl.replace(/\/$/, "")} onCopy={() => copy(baseUrl.replace(/\/$/, ""), "Origin")} />
            )}
          </li>
          <li>
            <strong>{isEl ? "Authorized redirect URIs" : "Authorized redirect URIs"}:</strong>
            <UriRow value={redirectUri} onCopy={() => copy(redirectUri, "Redirect URI")} />
          </li>
          <li>{isEl ? "Αντιγράψτε Client ID & Client Secret παρακάτω" : "Copy Client ID & Client Secret below"}</li>
        </ol>
      </GuideStep>

      <GuideStep n={4} title={isEl ? `Ρύθμιση ${brandFullName}` : `Configure ${brandFullName}`} color="green">
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>{isEl ? "Base URL = ίδιο domain με τα redirect URIs" : "Base URL = same domain as redirect URIs"}</li>
          <li>{isEl ? "Επικολλήστε Client ID & Secret · ενεργοποιήστε Google OAuth" : "Paste Client ID & Secret · enable Google OAuth"}</li>
          <li>
            <strong className="text-red-600">
              {isEl ? "Επανεκκίνηση server μετά την αποθήκευση" : "Restart server after saving"}
            </strong>
          </li>
          <li>{isEl ? "Δοκιμή: «Σύνδεση με Google» στη σελίδα login" : "Test: “Sign in with Google” on login page"}</li>
        </ol>
      </GuideStep>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {isEl ? "Production: HTTPS, " : "Production: HTTPS, "}
          <code className="text-xs">https://your-domain.com</code>
          {isEl ? " στα origins + " : " in origins + "}
          <code className="text-xs">https://your-domain.com/api/auth/google/callback</code>
        </AlertDescription>
      </Alert>

      <div className="text-sm rounded-md border p-3 bg-muted/40 space-y-1">
        <p className="font-medium">{isEl ? "Συχνά σφάλματα" : "Common errors"}</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>redirect_uri_mismatch → {isEl ? "URI ακριβώς όπως παραπάνω" : "URI must match exactly"}</li>
          <li>access_denied → {isEl ? "Test user ή Publish app" : "Test user or publish app"}</li>
          <li>{isEl ? "Δεν εμφανίζεται κουμπί → restart server + Enable Google OAuth" : "No button → restart + Enable Google OAuth"}</li>
        </ul>
      </div>
    </div>
  );
}

function GuideStep({
  n,
  title,
  color,
  children,
}: {
  n: number;
  title: string;
  color: "blue" | "green" | "purple" | "orange";
  children: React.ReactNode;
}) {
  const styles = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
  };
  return (
    <Alert className={styles[color]}>
      <Key className="h-4 w-4" />
      <AlertTitle>
        {n}. {title}
      </AlertTitle>
      <AlertDescription className="text-inherit opacity-90">{children}</AlertDescription>
    </Alert>
  );
}

function UriRow({ value, onCopy }: { value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-2 bg-white/60 dark:bg-black/20 p-2 rounded font-mono text-xs">
      <code className="flex-1 break-all">{value}</code>
      <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );
}
