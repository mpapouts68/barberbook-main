import { AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const linkClass = "text-blue-600 underline";

/** In-app setup guide aligned with Google Workspace credentials docs (May 2026). */
export function GoogleCalendarSetupGuide() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Ενημέρωση: Μάιος 2026 ·{" "}
        <a
          href="https://developers.google.com/workspace/guides/create-credentials"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Google Workspace – Create credentials
        </a>
      </p>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>
            <strong>Πώς λειτουργεί το PEQI:</strong> Service Account + διαμοιρασμός ημερολογίου ανά
            υπάλληλο. Δεν γίνεται σύνδεση OAuth με προσωπικό Gmail.
          </p>
          <p>
            <strong>Δεν χρειάζεται:</strong> OAuth consent screen, OAuth Client ID, domain-wide
            delegation, ούτε «API key» από το μενού APIs &amp; Services → Credentials.
          </p>
          <p>
            Χρειάζεστε ρόλο <strong>Owner</strong> ή <strong>Editor</strong> στο Google Cloud project.
          </p>
        </AlertDescription>
      </Alert>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Βήμα 1: Project στο Google Cloud</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className={linkClass}>
              Google Cloud Console
            </a>
          </li>
          <li>
            Επιλέξτε υπάρχον project ή <strong>Select a project → New Project</strong> (π.χ. «peqi-calendar»)
          </li>
          <li>Σημειώστε το <strong>Project ID</strong> — θα το χρειαστείτε στη φόρμα</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Βήμα 2: Ενεργοποίηση Google Calendar API</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Μενού ☰ → <strong>APIs &amp; Services</strong> →{" "}
            <a
              href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Google Calendar API
            </a>
          </li>
          <li>
            Κάντε κλικ <strong>Enable</strong> (αν δεν είναι ήδη ενεργό)
          </li>
          <li>
            Έλεγχος: <strong>APIs &amp; Services → Enabled APIs</strong> — πρέπει να εμφανίζεται το Calendar API
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Βήμα 3: Δημιουργία Service Account</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Μενού ☰ → <strong>IAM &amp; Admin</strong> →{" "}
            <a
              href="https://console.cloud.google.com/iam-admin/serviceaccounts"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Service Accounts
            </a>
          </li>
          <li>
            <strong>Create service account</strong> → όνομα π.χ. <code className="text-xs">peqi-calendar</code>
          </li>
          <li>
            <strong>Create and continue</strong> — στο βήμα ρόλων <em>δεν</em> χρειάζονται IAM roles για
            Calendar
          </li>
          <li>
            <strong>Done</strong> — αντιγράψτε το email (<code className="text-xs">...@....iam.gserviceaccount.com</code>)
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Βήμα 4: Λήψη κλειδιού JSON (όχι API key)</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Ανοίξτε το service account → καρτέλα <strong>Keys</strong></li>
          <li>
            <strong>Add key → Create new key</strong> → τύπος <strong>JSON</strong> → <strong>Create</strong>
          </li>
          <li>
            Κατεβαίνει αρχείο <code className="text-xs">*.json</code> — μοναδικό αντίγραφο του private key
          </li>
          <li>
            Από το JSON: <code className="text-xs">client_email</code>, <code className="text-xs">project_id</code>,
            και όλο το αρχείο για το πεδίο «Service Account Key»
          </li>
        </ol>
        <Alert className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Μην ανεβάζετε το JSON σε Git ή δημόσια repos. Αν χαθεί, δημιουργήστε νέο κλειδί και απενεργοποιήστε
            το παλιό από την καρτέλα Keys.
          </AlertDescription>
        </Alert>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Βήμα 5: Διαμοιρασμός ημερολογίων υπαλλήλων</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
              Google Calendar
            </a>{" "}
            με τον λογαριασμό του υπαλλήλου
          </li>
          <li>
            Επιλέξτε ημερολόγιο → ⋮ → <strong>Settings and sharing</strong>
          </li>
          <li>
            <strong>Share with specific people</strong> → προσθέστε το <code className="text-xs">client_email</code>{" "}
            του service account
          </li>
          <li>
            Δικαιώματα: <strong>Make changes to events</strong> (όχι μόνο προβολή)
          </li>
          <li>
            <strong>Integrate calendar</strong> → αντιγράψτε το <strong>Calendar ID</strong>
          </li>
          <li>
            Στο PEQI: <strong>Διαχείριση → Υπάλληλοι</strong> → επεξεργασία → Google Calendar ID + ενεργοποίηση
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold text-lg">Βήμα 6: Συμπλήρωση φόρμας &amp; δοκιμή</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            <strong>Service Account Email:</strong> πεδίο <code className="text-xs">client_email</code>
          </li>
          <li>
            <strong>Project ID:</strong> πεδίο <code className="text-xs">project_id</code>
          </li>
          <li>
            <strong>Service Account Key:</strong> ολόκληρο το JSON
          </li>
          <li>
            Αποθηκεύστε, ενεργοποιήστε το switch, μετά <strong>Δοκιμή Σύνδεσης</strong> με Calendar ID υπαλλήλου
          </li>
        </ul>
      </section>

      <div className="space-y-2 text-sm rounded-md border p-3 bg-muted/40">
        <p className="font-medium">Συχνά σφάλματα</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>
            <strong>404 / Calendar not found:</strong> λάθος Calendar ID ή το ημερολόγιο δεν διαμοιράστηκε με το
            service account
          </li>
          <li>
            <strong>403 / Permission denied:</strong> δικαιώματα «Make changes to events» ή λάθος email
          </li>
          <li>
            <strong>API not enabled:</strong> ενεργοποιήστε το Calendar API στο σωστό project
          </li>
        </ul>
      </div>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Scopes της εφαρμογής:</strong>{" "}
          <code className="text-xs">https://www.googleapis.com/auth/calendar</code> και{" "}
          <code className="text-xs">calendar.events</code>.{" "}
          <a
            href="https://developers.google.com/workspace/calendar/api/auth"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Επίσημη λίστα scopes
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
}
