import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Save, Key, Globe, Shield, ExternalLink, HelpCircle, Info, Copy, Check, Languages } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { oauthTranslations } from "@/i18n/oauth-translations";
import { GoogleOAuthSetupGuide } from "@/components/GoogleOAuthSetupGuide";
import { brandFullName } from "@/lib/branding";

const DEFAULT_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5100"
    : "https://peqi.hair";

interface OAuthConfig {
  id?: string;
  googleEnabled?: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  facebookEnabled?: boolean;
  facebookAppId?: string;
  facebookAppSecret?: string;
  baseUrl?: string;
  sessionSecret?: string;
  isConfigured?: boolean;
}

export function OAuthSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<"el" | "en">("el"); // Default to Greek

  const [formData, setFormData] = useState<OAuthConfig>({
    googleEnabled: false,
    googleClientId: "",
    googleClientSecret: "",
    facebookEnabled: false,
    facebookAppId: "",
    facebookAppSecret: "",
    baseUrl: DEFAULT_BASE_URL,
    sessionSecret: ""
  });

  // Use imported translations
  const t = oauthTranslations[language] as typeof oauthTranslations.el;

  const { data: config, isLoading } = useQuery<OAuthConfig>({
    queryKey: ["/api/admin/oauth-config"]
  });

  // Update form data when config loads
  useEffect(() => {
    if (config && config.isConfigured) {
      setFormData({
        ...config,
        // Ensure baseUrl is set - use from config, env, or default to production domain
        baseUrl: config.baseUrl || DEFAULT_BASE_URL,
        // Keep the hidden secrets as they are
        googleClientSecret: config.googleClientSecret === "[HIDDEN]" ? "" : config.googleClientSecret || "",
        facebookAppSecret: config.facebookAppSecret === "[HIDDEN]" ? "" : config.facebookAppSecret || "",
        sessionSecret: config.sessionSecret === "[HIDDEN]" ? "" : config.sessionSecret || ""
      });
    } else {
      // If no config exists, set default baseUrl to production domain
      setFormData(prev => ({
        ...prev,
        baseUrl: prev.baseUrl === "https://your-domain.com" ? DEFAULT_BASE_URL : (prev.baseUrl || DEFAULT_BASE_URL)
      }));
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (configData: OAuthConfig) => {
      return await apiRequest("/api/admin/oauth-config", "POST", configData);
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Οι ρυθμίσεις OAuth αποθηκεύτηκαν επιτυχώς",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/oauth-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία αποθήκευσης ρυθμίσεων OAuth",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    // Only send fields that have been modified or are not hidden
    const dataToSave: any = {
      googleEnabled: formData.googleEnabled,
      facebookEnabled: formData.facebookEnabled,
      baseUrl: formData.baseUrl
    };

    if (formData.googleClientId) dataToSave.googleClientId = formData.googleClientId;
    if (formData.googleClientSecret) dataToSave.googleClientSecret = formData.googleClientSecret;
    if (formData.facebookAppId) dataToSave.facebookAppId = formData.facebookAppId;
    if (formData.facebookAppSecret) dataToSave.facebookAppSecret = formData.facebookAppSecret;
    if (formData.sessionSecret) dataToSave.sessionSecret = formData.sessionSecret;

    saveConfigMutation.mutate(dataToSave);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const isGoogleConfigured = config?.googleClientId && (config?.googleClientSecret === "[HIDDEN]" || config?.googleClientSecret);
  const isFacebookConfigured = config?.facebookAppId && (config?.facebookAppSecret === "[HIDDEN]" || config?.facebookAppSecret);

  return (
    <div className="space-y-6">
      {/* Language Toggle */}
      <Card className="metal-gradient border-steel">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-300">
              <Languages className="w-5 h-5 text-whiskey" />
              <span className="font-semibold text-white">
                {language === "el" ? "Γλώσσα Οδηγών" : "Guide Language"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-charcoal border border-steel rounded-lg p-1">
              <Button
                size="sm"
                variant={language === "el" ? "default" : "ghost"}
                onClick={() => setLanguage("el")}
                className={language === "el" ? "bg-whiskey text-black font-semibold" : "text-gray-400"}
              >
                🇬🇷 Ελληνικά
              </Button>
              <Button
                size="sm"
                variant={language === "en" ? "default" : "ghost"}
                onClick={() => setLanguage("en")}
                className={language === "en" ? "bg-whiskey text-black font-semibold" : "text-gray-400"}
              >
                🇬🇧 English
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Alert className="bg-whiskey/10 border-whiskey/30">
        <HelpCircle className="h-4 w-4 text-whiskey" />
        <AlertTitle className="text-whiskey">
          {language === "el" ? "Σχετικά με το OAuth Social Login" : "About OAuth Social Login"}
        </AlertTitle>
        <AlertDescription className="text-gray-300">
          <p className="mb-2">{t.oauthInfo}</p>
          <p className="text-sm font-semibold">⚠️ {t.oauthOptional}</p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>{t.listItem1}</li>
            <li>{t.listItem2}</li>
            <li>{t.listItem3}</li>
            <li><strong className="text-whiskey">{t.listItem4}</strong></li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Status Overview */}
      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-whiskey">
            <Shield className="w-5 h-5" />
            {t.oauthStatus}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t.statusDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border border-steel rounded-lg bg-charcoal/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold text-sm">G</div>
                <span className="font-medium text-white">Google</span>
              </div>
              <Badge variant={isGoogleConfigured && formData.googleEnabled ? "default" : "secondary"} className={isGoogleConfigured && formData.googleEnabled ? "bg-green-600" : ""}>
                {isGoogleConfigured && formData.googleEnabled ? `✅ ${t.active}` : isGoogleConfigured ? t.configured : t.notConfigured}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border border-steel rounded-lg bg-charcoal/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">f</div>
                <span className="font-medium text-white">Facebook</span>
              </div>
              <Badge variant={isFacebookConfigured && formData.facebookEnabled ? "default" : "secondary"} className={isFacebookConfigured && formData.facebookEnabled ? "bg-green-600" : ""}>
                {isFacebookConfigured && formData.facebookEnabled ? `✅ ${t.active}` : isFacebookConfigured ? t.configured : t.notConfigured}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="google">Google OAuth</TabsTrigger>
          <TabsTrigger value="facebook">Facebook OAuth</TabsTrigger>
          <TabsTrigger value="general">Γενικές Ρυθμίσεις</TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">G</div>
                Διαμόρφωση Google OAuth
              </CardTitle>
              <CardDescription>
                Ρυθμίσεις για την εικονιδιοφάνεια με Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Base URL Field - Critical for OAuth */}
              <Alert className="bg-blue-900/20 border-blue-600/30">
                <Globe className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-300">⚠️ Base URL Required</AlertTitle>
                <AlertDescription className="text-blue-200 text-sm">
                  The Base URL is used to construct OAuth callback URLs. It must match your domain exactly.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="baseUrl-google" className="text-whiskey font-semibold">
                  Base URL (Required for OAuth) *
                </Label>
                <Input
                  id="baseUrl-google"
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://peqi.hair"
                  className="bg-slate border-steel text-white"
                />
                <p className="text-sm text-gray-400">
                  This will be used to create callback URL: <code className="bg-charcoal px-2 py-1 rounded text-xs">{formData.baseUrl || 'https://your-domain.com'}/api/auth/google/callback</code>
                </p>
                {!formData.baseUrl || formData.baseUrl === "https://your-domain.com" ? (
                  <p className="text-sm text-yellow-400">
                    ⚠️ Please set your actual domain (e.g., https://peqi.hair)
                  </p>
                ) : null}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center space-x-2">
                <Switch
                  id="googleEnabled"
                  checked={formData.googleEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, googleEnabled: checked }))}
                />
                <Label htmlFor="googleEnabled">{t.enableGoogle}</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleClientId">Google Client ID</Label>
                <Input
                  id="googleClientId"
                  type="text"
                  value={formData.googleClientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleClientId: e.target.value }))}
                  placeholder="your-google-client-id.googleusercontent.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleClientSecret">Google Client Secret</Label>
                <Input
                  id="googleClientSecret"
                  type="password"
                  value={formData.googleClientSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleClientSecret: e.target.value }))}
                  placeholder={(config?.googleClientSecret === "[HIDDEN]") ? "••••••••" : "GOCSPX-..."}
                />
                {(config?.googleClientSecret === "[HIDDEN]") && (
                  <p className="text-sm text-muted-foreground">
                    Το μυστικό αποθηκεύεται με ασφάλεια. Αφήστε το κενό για να το κρατήσετε.
                  </p>
                )}
              </div>

              {/* Detailed Setup Instructions */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="setup-guide">
                  <AccordionTrigger className="text-whiskey hover:text-whiskey/80">
                    <div className="flex items-center gap-2">
                      <FaGoogle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold">📋 {t.setupGuide}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <GoogleOAuthSetupGuide
                      language={language}
                      baseUrl={formData.baseUrl || DEFAULT_BASE_URL}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facebook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">f</div>
                Διαμόρφωση Facebook OAuth
              </CardTitle>
              <CardDescription>
                Ρυθμίσεις για την εικονιδιοφάνεια με Facebook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="facebookEnabled"
                  checked={formData.facebookEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, facebookEnabled: checked }))}
                />
                <Label htmlFor="facebookEnabled">{t.enableFacebook}</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookAppId">Facebook App ID</Label>
                <Input
                  id="facebookAppId"
                  type="text"
                  value={formData.facebookAppId}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebookAppId: e.target.value }))}
                  placeholder="123456789012345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookAppSecret">Facebook App Secret</Label>
                <Input
                  id="facebookAppSecret"
                  type="password"
                  value={formData.facebookAppSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebookAppSecret: e.target.value }))}
                  placeholder={(config?.facebookAppSecret === "[HIDDEN]") ? "••••••••" : "abcdef123456..."}
                />
                {(config?.facebookAppSecret === "[HIDDEN]") && (
                  <p className="text-sm text-muted-foreground">
                    Το μυστικό αποθηκεύεται με ασφάλεια. Αφήστε το κενό για να το κρατήσετε.
                  </p>
                )}
              </div>

              {/* Detailed Facebook Setup Instructions */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="facebook-setup-guide">
                  <AccordionTrigger className="text-whiskey hover:text-whiskey/80">
                    <div className="flex items-center gap-2">
                      <FaFacebook className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">📋 {t.setupGuide}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      
                      {/* Step 1 */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">{t.step} 1: {t.facebook.step1Title}</AlertTitle>
                        <AlertDescription className="text-blue-700 space-y-2">
                          <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>
                              Visit <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold inline-flex items-center gap-1">
                                Facebook for Developers <ExternalLink className="w-3 h-3" />
                              </a>
                            </li>
                            <li>Click <strong>"My Apps"</strong> in the top right</li>
                            <li>Click <strong>"Create App"</strong> button</li>
                            <li>Select app type: <strong>"Consumer"</strong></li>
                            <li>Click <strong>"Next"</strong></li>
                            <li>Enter app details:
                              <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Display Name: <code className="bg-blue-100 px-2 py-1 rounded">{brandFullName}</code></li>
                                <li>App Contact Email: Your email</li>
                              </ul>
                            </li>
                            <li>Click <strong>"Create App"</strong></li>
                            <li>Complete security check (CAPTCHA)</li>
                          </ol>
                        </AlertDescription>
                      </Alert>

                      {/* Step 2 */}
                      <Alert className="bg-green-50 border-green-200">
                        <Info className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">{t.step} 2: {t.facebook.step2Title}</AlertTitle>
                        <AlertDescription className="text-green-700 space-y-2">
                          <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>You'll see the <strong>"Add Products to Your App"</strong> screen</li>
                            <li>Find the <strong>"Facebook Login"</strong> card</li>
                            <li>Click <strong>"Set Up"</strong> button on Facebook Login</li>
                            <li>Choose platform: <strong>"Web"</strong> (WWW icon)</li>
                            <li>Enter Site URL: 
                              <div className="bg-green-100 p-2 rounded mt-2 font-mono text-xs flex items-center justify-between">
                                <code>http://localhost:5100</code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText("http://localhost:5100");
                                    toast({ title: "Copied!", description: "Site URL copied to clipboard" });
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </li>
                            <li>Click <strong>"Save"</strong> → <strong>"Continue"</strong></li>
                            <li>You can skip the SDK setup steps (PEQI handles this)</li>
                          </ol>
                        </AlertDescription>
                      </Alert>

                      {/* Step 3 */}
                      <Alert className="bg-purple-50 border-purple-200">
                        <Info className="h-4 w-4 text-purple-600" />
                        <AlertTitle className="text-purple-800">{t.step} 3: {t.facebook.step3Title}</AlertTitle>
                        <AlertDescription className="text-purple-700 space-y-2">
                          <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>In left sidebar: <strong>Products → Facebook Login → Settings</strong></li>
                            <li>Find <strong>"Valid OAuth Redirect URIs"</strong> field</li>
                            <li>Add this redirect URI:
                              <div className="bg-purple-100 p-2 rounded mt-2 font-mono text-xs flex items-center justify-between">
                                <code>{formData.baseUrl}/api/auth/facebook/callback</code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${formData.baseUrl}/api/auth/facebook/callback`);
                                    toast({ title: "Copied!", description: "Redirect URI copied to clipboard" });
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </li>
                            <li>Scroll down and configure:
                              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                                <li>✅ <strong>Client OAuth Login:</strong> YES</li>
                                <li>✅ <strong>Web OAuth Login:</strong> YES</li>
                                <li>✅ <strong>Use Strict Mode for Redirect URIs:</strong> YES</li>
                                <li>❌ <strong>Enforce HTTPS:</strong> NO (for dev), YES (for production)</li>
                              </ul>
                            </li>
                            <li>Click <strong>"Save Changes"</strong> at the bottom</li>
                          </ol>
                        </AlertDescription>
                      </Alert>

                      {/* Step 4 */}
                      <Alert className="bg-orange-50 border-orange-200">
                        <Key className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-800">{t.step} 4: {t.facebook.step4Title}</AlertTitle>
                        <AlertDescription className="text-orange-700 space-y-2">
                          <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>In left sidebar: <strong>Settings → Basic</strong></li>
                            <li>You'll see:
                              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                                <li><strong>App ID:</strong> <code className="bg-orange-100 px-2 py-1 rounded">1234567890123456</code></li>
                                <li><strong>App Secret:</strong> Click <strong>"Show"</strong> to reveal</li>
                              </ul>
                            </li>
                            <li><strong>Copy the App ID</strong> (paste in field above)</li>
                            <li>Click <strong>"Show"</strong> next to App Secret</li>
                            <li><strong>Copy the App Secret</strong> (paste in field above)</li>
                          </ol>
                        </AlertDescription>
                      </Alert>

                      {/* Step 5 - Dev Mode vs Live Mode */}
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800">{t.step} 5: {t.facebook.step5Title}</AlertTitle>
                        <AlertDescription className="text-yellow-700 space-y-2">
                          <p className="font-semibold mt-2">Your app starts in "Development Mode"</p>
                          <p className="text-sm">In Development Mode, only test users can login. You have two options:</p>
                          
                          <div className="bg-yellow-100 p-3 rounded mt-2">
                            <p className="font-semibold mb-2">Option A: Add Test Users (For Testing)</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                              <li>Go to <strong>Roles → Test Users</strong> in left sidebar</li>
                              <li>Click <strong>"Add Test Users"</strong></li>
                              <li>Create test accounts</li>
                              <li>Use these accounts to test Facebook login</li>
                            </ol>
                          </div>

                          <div className="bg-yellow-100 p-3 rounded mt-2">
                            <p className="font-semibold mb-2">Option B: Switch to Live Mode (For Real Users)</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                              <li>In top navigation, find <strong>"App Mode"</strong> toggle</li>
                              <li>Before going Live, you need:
                                <ul className="list-disc list-inside ml-6 mt-1">
                                  <li><strong>Privacy Policy URL</strong> (required)</li>
                                  <li><strong>Terms of Service URL</strong> (required)</li>
                                  <li><strong>App Icon</strong> (1024x1024px recommended)</li>
                                  <li><strong>App Category</strong> (e.g., "Business and Pages")</li>
                                </ul>
                              </li>
                              <li>Fill in all requirements in <strong>Settings → Basic</strong></li>
                              <li>Toggle to <strong>"Live Mode"</strong></li>
                </ol>
              </div>
                          
                          <p className="text-xs mt-2 italic">
                            💡 <strong>Tip:</strong> For testing, use Option A (Test Users). For production, use Option B (Live Mode).
                          </p>
                        </AlertDescription>
                      </Alert>

                      {/* Step 6 */}
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">{t.step} 6: {t.facebook.step6Title}</AlertTitle>
                        <AlertDescription className="text-green-700 space-y-2">
                          <ol className="list-decimal list-inside space-y-2 mt-2">
                            <li>Paste your <strong>App ID</strong> in the field above</li>
                            <li>Paste your <strong>App Secret</strong> in the field above</li>
                            <li>Check <strong>"✅ Enable Facebook OAuth"</strong></li>
                            <li>Click <strong>"Save Configuration"</strong> button at the bottom</li>
                            <li><strong className="text-red-600">⚠️ IMPORTANT: Restart the server</strong> after saving!</li>
                            <li>Run: <code className="bg-green-100 px-2 py-1 rounded font-mono text-xs">restart-app.bat</code></li>
                            <li>Test by clicking "Continue with Facebook" on the login page</li>
                          </ol>
                        </AlertDescription>
                      </Alert>

                      {/* Production Note */}
                      <Alert>
                        <Globe className="h-4 w-4" />
                        <AlertTitle>{t.facebook.productionTitle}</AlertTitle>
                        <AlertDescription className="text-sm space-y-2">
                          <p>{t.facebook.production[0]}</p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Update Site URL to: <code className="bg-gray-100 px-1 rounded">https://yourdomain.com</code></li>
                            <li>Add production callback: <code className="bg-gray-100 px-1 rounded">https://yourdomain.com/api/auth/facebook/callback</code></li>
                            <li>Update Base URL in PEQI Admin to your domain</li>
                            <li><strong>Required for Live Mode:</strong> Privacy Policy & Terms URLs</li>
                            <li>Enable <strong>"Enforce HTTPS"</strong> in Facebook Login settings</li>
                            <li>Submit for App Review if using advanced permissions</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      {/* Troubleshooting */}
                      <Alert className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle className="text-red-800">{t.facebook.troubleshootingTitle}</AlertTitle>
                        <AlertDescription className="text-red-700 space-y-2">
                          <div className="space-y-3 mt-2">
                            <div>
                              <p className="font-semibold">❌ "Can't Load URL" Error</p>
                              <p className="text-sm">→ Check redirect URI matches exactly: <code className="bg-red-100 px-1 rounded text-xs">{formData.baseUrl}/api/auth/facebook/callback</code></p>
                            </div>
                            <div>
                              <p className="font-semibold">❌ "App Not Setup" Error</p>
                              <p className="text-sm">→ Make sure Facebook Login product is added to your app</p>
                            </div>
                            <div>
                              <p className="font-semibold">❌ Only Test Users Can Login</p>
                              <p className="text-sm">→ App is in Development Mode. Either add test users OR switch to Live Mode</p>
                            </div>
                            <div>
                              <p className="font-semibold">❌ "Invalid OAuth Access Token"</p>
                              <p className="text-sm">→ Double-check App Secret is correct (click "Show" in Facebook settings)</p>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>

                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Γενικές Ρυθμίσεις
              </CardTitle>
              <CardDescription>
                Γενικές ρυθμίσεις OAuth και ασφάλειας
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-900/20 border-yellow-600/30">
                <Globe className="h-4 w-4 text-yellow-400" />
                <AlertTitle className="text-yellow-300 font-semibold">⚠️ Critical: Base URL Configuration</AlertTitle>
                <AlertDescription className="text-yellow-200 text-sm">
                  The Base URL is essential for OAuth redirect URIs to work correctly. It must match your actual domain and be configured in Google Cloud Console.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-whiskey font-semibold text-lg">
                  Base URL Εφαρμογής (Required) *
                </Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={formData.baseUrl || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://peqi.hair"
                  className="bg-slate border-steel text-white font-mono text-lg"
                />
                <div className="space-y-2 mt-2">
                  <p className="text-sm text-gray-400">
                    Το βασικό URL της εφαρμογής για τα OAuth callbacks. Χρησιμοποιείται για να δημιουργηθεί το callback URL.
                  </p>
                  <div className="bg-charcoal p-3 rounded border border-steel">
                    <p className="text-xs text-gray-500 mb-1">Generated Callback URL:</p>
                    <p className="text-sm text-whiskey font-mono break-all">
                      {formData.baseUrl || 'https://your-domain.com'}/api/auth/google/callback
                    </p>
                  </div>
                  {(!formData.baseUrl || formData.baseUrl === "https://your-domain.com") && (
                    <Alert className="bg-red-900/20 border-red-600/30">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300 text-sm">
                        ⚠️ Please set your actual domain! (e.g., https://peqi.hair)
                      </AlertDescription>
                    </Alert>
                  )}
                  {formData.baseUrl && formData.baseUrl !== "https://your-domain.com" && formData.baseUrl.startsWith("https://") && (
                    <Alert className="bg-green-900/20 border-green-600/30">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-300 text-sm">
                        ✅ Make sure this exact callback URL is added to Google Cloud Console as a redirect URI
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionSecret">Session Secret</Label>
                <Input
                  id="sessionSecret"
                  type="password"
                  value={formData.sessionSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, sessionSecret: e.target.value }))}
                  placeholder={(config?.sessionSecret === "[HIDDEN]") ? "••••••••" : "your-secret-key"}
                />
                {(config?.sessionSecret === "[HIDDEN]") && (
                  <p className="text-sm text-muted-foreground">
                    Το μυστικό αποθηκεύεται με ασφάλεια. Αφήστε το κενό για να το κρατήσετε.
                  </p>
                )}
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 text-yellow-800 mb-2">
                  <Key className="w-4 h-4" />
                  Συμβουλή Ασφάλειας
                </h4>
                <p className="text-sm text-yellow-700">
                  Χρησιμοποιήστε ένα ισχυρό, μοναδικό session secret για να διασφαλίσετε την ασφάλεια των συνεδρίων χρηστών.
                  Μπορείτε να χρησιμοποιήσετε έναν γεννήτορα τυχαίων συμβολοσειρών.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Save Configuration Section */}
      <Card className="metal-gradient border-steel">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-whiskey mb-2">{t.readyToSave}</h3>
              <p className="text-gray-400 text-sm mb-3">
                {t.mustRestart}
              </p>
              <Alert className="bg-red-900/20 border-red-600/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">
                  <p className="font-semibold">⚠️ {t.importantRestart}</p>
                  <p className="text-xs mt-1">{t.afterSaving}</p>
                  <div className="bg-red-950/50 p-2 rounded mt-2 font-mono text-xs flex items-center justify-between">
                    <code className="text-red-300">restart-app.bat</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText("restart-app.bat");
                        toast({ title: t.copied, description: t.copiedDesc });
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
        <Button 
          onClick={handleSave} 
          disabled={saveConfigMutation.isPending}
              className="whiskey-gradient text-black font-semibold hover:opacity-90 flex items-center gap-2 px-6 py-6"
        >
              <Save className="w-5 h-5" />
              {saveConfigMutation.isPending ? t.saving : t.saveConfig}
        </Button>
      </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="metal-gradient border-steel">
        <CardHeader>
          <CardTitle className="text-whiskey flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            {t.usefulLinks}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <FaGoogle className="text-red-500" />
                Google
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a 
                    href="https://console.cloud.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-whiskey hover:underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://console.cloud.google.com/apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-whiskey hover:underline inline-flex items-center gap-1"
                  >
                    OAuth Credentials <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://developers.google.com/identity/protocols/oauth2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:underline inline-flex items-center gap-1"
                  >
                    Documentation <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <FaFacebook className="text-blue-600" />
                Facebook
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a 
                    href="https://developers.facebook.com/apps/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-whiskey hover:underline inline-flex items-center gap-1"
                  >
                    Facebook App Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://developers.facebook.com/docs/facebook-login/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:underline inline-flex items-center gap-1"
                  >
                    Facebook Login Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}