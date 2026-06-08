import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { getPaymentSettings, savePaymentSettings } from "../../utils/fees_manager_api";
import { 
  Key, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  ShieldAlert, 
  BookOpen, 
  Lock, 
  Check, 
  Settings,
  AlertTriangle 
} from "lucide-react";

const RAZORPAY_DASHBOARD = 'https://dashboard.razorpay.com/app/';
const RAZORPAY_DOCS_KEYS = 'https://razorpay.com/docs/payment-gateway/server-integration/';

const allowedRoles = ['fees_manager', 'principal'];

const PaymentSettings: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [editing, setEditing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || '';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getPaymentSettings();
      if (res.success) {
        setConfigured(res.data.configured || false);
        setKeyId(res.data.razorpay_key_id || '');
        setEditing(!res.data.configured);
      } else {
        showErrorAlert('Error', res.message || 'Failed to fetch settings');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!keyId || !keySecret) {
      showErrorAlert('Missing fields', 'Please enter both Key ID and Key Secret');
      return;
    }
    setSaving(true);
    setValidating(true);
    try {
      const res = await savePaymentSettings({ razorpay_key_id: keyId.trim(), razorpay_key_secret: keySecret.trim() });
      if (res.success) {
        showSuccessAlert('Saved', res.message || 'Payment settings saved');
        setConfigured(true);
        setKeySecret('');
        setEditing(false);
        fetchSettings();
      } else {
        showErrorAlert('Error', res.message || 'Failed to save settings');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    } finally {
      setSaving(false);
      setValidating(false);
    }
  };

  const openRazorpay = () => {
    window.open(RAZORPAY_DASHBOARD, '_blank');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showSuccessAlert('Copied', 'Key ID copied to clipboard');
    } catch (e) {
      showErrorAlert('Error', 'Unable to copy');
    }
  };

  const isAllowed = allowedRoles.includes(role);
  const maskedKey = (k: string) => {
    if (!k) return '';
    if (k.length <= 10) return k[0] + '***' + k.slice(-3);
    return `${k.slice(0, 4)}...${k.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium animate-pulse">Loading Integration Settings...</p>
      </div>
    );
  }

  return (
    <div id="feesmanager-payment-settings-container" className="flex justify-center w-full">
      <div className="w-full space-y-6">
        {/* Main Card Header */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader id="feesmanager-payment-settings-header" className="border-b bg-muted/10 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Payment Settings
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">Configure Razorpay payment gateway integration for your college</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`px-4 py-1.5 font-semibold text-sm ${configured ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
                  {configured ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instructions Box */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b bg-muted/10 p-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Quick Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ol className="list-decimal list-outside text-sm space-y-4 text-muted-foreground ml-4">
                  <li className="leading-relaxed">
                    Open the <a className="text-primary hover:underline font-semibold inline-flex items-center gap-1" href={RAZORPAY_DASHBOARD} target="_blank" rel="noreferrer">Razorpay Dashboard <ExternalLink className="h-3.5 w-3.5" /></a>.
                  </li>
                  <li className="leading-relaxed">Sign in or create an account for your college.</li>
                  <li className="leading-relaxed">In the Dashboard, go to <strong>Settings → API Keys</strong> and generate a new key pair.</li>
                  <li className="leading-relaxed">Copy the <strong>Key ID</strong> and <strong>Key Secret</strong>.</li>
                  <li className="leading-relaxed">Paste Key ID below and paste Key Secret once — it will not be shown again.</li>
                  <li className="leading-relaxed">Click <strong>Save & Validate</strong>. Our dashboard will validate the keys and save them securely for your organization.</li>
                </ol>

                <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Helpful Links</span>
                  <div>
                    <a className="text-sm text-primary hover:underline font-semibold inline-flex items-center gap-1.5" href={RAZORPAY_DOCS_KEYS} target="_blank" rel="noreferrer">
                      Razorpay Docs — API Keys <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-6">
                  <Button variant="outline" onClick={openRazorpay} className="w-full flex items-center justify-center gap-2 h-11">
                    Open Razorpay Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b bg-muted/10 p-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Organization Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {!isAllowed && (
                  <div className="p-4 border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200 rounded-xl text-sm flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Authorization Required</span>
                      <p className="mt-1 opacity-90">You are not authorized to change payment settings. Please contact your Principal or Fees Manager to configure credentials.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Razorpay Key ID</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        value={editing ? keyId : (configured ? maskedKey(keyId) : keyId)} 
                        onChange={(e) => { setKeyId(e.target.value); setEditing(true); }} 
                        placeholder={configured ? maskedKey(keyId) : 'rzp_test_xxx'} 
                        disabled={!isAllowed || (configured && !editing)} 
                        className="h-11 bg-background border-border flex-1"
                      />
                      <div className="flex gap-2 shrink-0">
                        {keyId && (
                          <Button variant="outline" onClick={() => copyToClipboard(keyId)} className="h-11 px-4 gap-1.5 flex-1 sm:flex-initial">
                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            Copy
                          </Button>
                        )}
                        {configured && !editing && (
                          <Button variant="ghost" onClick={() => setEditing(true)} className="h-11 px-4 text-primary hover:text-primary/80 font-semibold flex-1 sm:flex-initial">
                            Replace
                          </Button>
                        )}
                      </div>
                    </div>
                    {configured && !editing && (
                      <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-emerald-500" /> Stored securely. Secret not shown.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Razorpay Key Secret</Label>
                    <Input 
                      value={keySecret} 
                      onChange={(e) => setKeySecret(e.target.value)} 
                      placeholder="Paste secret here - will not be shown again" 
                      disabled={!isAllowed} 
                      className="h-11 bg-background border-border"
                      type="password"
                    />
                  </div>

                  <div className="pt-4 border-t border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Keys are saved locally and used only to authorize client transactions securely.</span>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <Button 
                        onClick={handleSave} 
                        disabled={!isAllowed || saving || validating} 
                        className="bg-primary text-white hover:bg-primary/90 shadow-md font-semibold h-11 px-6 w-full md:w-auto md:min-w-[150px]"
                      >
                        {saving || validating ? 'Saving...' : 'Save & Validate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
