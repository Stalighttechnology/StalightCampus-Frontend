import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { 
  getPaymentSettings, 
  savePaymentSettings, 
  uploadSBIMISReport,
  PaymentSettingsPayload 
} from "../../utils/fees_manager_api";
import { 
  Key, 
  ExternalLink, 
  Copy, 
  Check, 
  Settings, 
  Lock, 
  IndianRupee, 
  ShieldAlert, 
  Landmark, 
  CreditCard, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2
} from "lucide-react";
import { SkeletonForm } from "../ui/skeleton";

const RAZORPAY_DASHBOARD = 'https://dashboard.razorpay.com/app/';
const SBI_PORTAL_URL = 'https://merchant.onlinesbi.sbi/EPMS/';

const allowedRoles = ['fees_manager', 'principal'];

const PaymentSettings: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [savingGateway, setSavingGateway] = useState(false);
  const [savingRazorpay, setSavingRazorpay] = useState(false);
  const [savingSbi, setSavingSbi] = useState(false);

  // Active Gateway Choice
  const [activeGateway, setActiveGateway] = useState<'razorpay' | 'sbi_epay' | 'both'>('razorpay');

  // Razorpay State
  const [configured, setConfigured] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [razorpayxAccountNumber, setRazorpayxAccountNumber] = useState('');
  const [editingRazorpay, setEditingRazorpay] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState(false);

  // SBIePay State
  const [sbiConfigured, setSbiConfigured] = useState(false);
  const [sbiMerchantId, setSbiMerchantId] = useState('');
  const [sbiEncryptionKey, setSbiEncryptionKey] = useState('');
  const [sbiAggregatorId, setSbiAggregatorId] = useState('SBIEPAY');
  const [sbiEnvironment, setSbiEnvironment] = useState<'uat' | 'prod'>('uat');
  const [editingSbi, setEditingSbi] = useState(false);
  const [copiedSbiMerchant, setCopiedSbiMerchant] = useState(false);

  // MIS Upload State
  const [misFile, setMisFile] = useState<File | null>(null);
  const [uploadingMis, setUploadingMis] = useState(false);
  const [misResult, setMisResult] = useState<any>(null);

  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || '';
  const isAllowed = allowedRoles.includes(role);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getPaymentSettings();
      if (res.success && res.data) {
        const d = res.data;
        setActiveGateway(d.active_collection_gateway || 'razorpay');

        // Razorpay
        setConfigured(d.configured || false);
        setKeyId(d.razorpay_key_id || '');
        setRazorpayxAccountNumber(d.razorpayx_account_number || '');
        setEditingRazorpay(!d.configured);

        // SBI
        setSbiConfigured(d.sbi_configured || false);
        setSbiMerchantId(d.sbi_epay_merchant_id || '');
        setSbiAggregatorId(d.sbi_epay_aggregator_id || 'SBIEPAY');
        setSbiEnvironment(d.sbi_epay_environment || 'uat');
        setEditingSbi(!d.sbi_configured);
      } else {
        showErrorAlert('Error', res.message || 'Failed to fetch settings');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActiveGateway = async (gateway: 'razorpay' | 'sbi_epay' | 'both') => {
    setActiveGateway(gateway);
    setSavingGateway(true);
    try {
      const res = await savePaymentSettings({ active_collection_gateway: gateway });
      if (res.success) {
        showSuccessAlert('Updated', `Collection gateway set to: ${gateway.replace('_', ' ').toUpperCase()}`);
      } else {
        showErrorAlert('Error', res.message || 'Failed to update gateway toggle');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleSaveRazorpay = async () => {
    if (!keyId) {
      showErrorAlert('Missing Key ID', 'Please enter a Razorpay Key ID');
      return;
    }
    if (!configured && !keySecret) {
      showErrorAlert('Missing Key Secret', 'Please enter a Razorpay Key Secret');
      return;
    }
    setSavingRazorpay(true);
    try {
      const res = await savePaymentSettings({
        razorpay_key_id: keyId.trim(),
        razorpay_key_secret: keySecret.trim(),
        razorpayx_account_number: razorpayxAccountNumber.trim()
      });
      if (res.success) {
        showSuccessAlert('Saved', 'Razorpay credentials saved and validated successfully.');
        setConfigured(true);
        setKeySecret('');
        setEditingRazorpay(false);
        fetchSettings();
      } else {
        showErrorAlert('Validation Failed', res.message || 'Failed to save Razorpay credentials');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    } finally {
      setSavingRazorpay(false);
    }
  };

  const handleSaveSBI = async () => {
    if (!sbiMerchantId) {
      showErrorAlert('Missing Merchant ID', 'Please enter an SBIePay Merchant ID');
      return;
    }
    if (!sbiConfigured && !sbiEncryptionKey) {
      showErrorAlert('Missing Encryption Key', 'Please enter an SBIePay Encryption Key');
      return;
    }
    setSavingSbi(true);
    try {
      const res = await savePaymentSettings({
        sbi_epay_merchant_id: sbiMerchantId.trim(),
        sbi_epay_encryption_key: sbiEncryptionKey.trim(),
        sbi_epay_aggregator_id: sbiAggregatorId.trim(),
        sbi_epay_environment: sbiEnvironment
      });
      if (res.success) {
        showSuccessAlert('Saved', 'SBIePay credentials validated and saved securely.');
        setSbiConfigured(true);
        setSbiEncryptionKey('');
        setEditingSbi(false);
        fetchSettings();
      } else {
        showErrorAlert('Validation Failed', res.message || 'Failed to save SBIePay credentials');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    } finally {
      setSavingSbi(false);
    }
  };

  const handleUploadMIS = async () => {
    if (!misFile) {
      showErrorAlert('No File Selected', 'Please select a CSV file from SBI portal.');
      return;
    }
    setUploadingMis(true);
    try {
      const res = await uploadSBIMISReport(misFile);
      if (res.success) {
        setMisResult(res.data);
        showSuccessAlert('Reconciliation Complete', res.message || 'MIS report reconciled successfully.');
      } else {
        showErrorAlert('Reconciliation Error', res.message || 'Failed to process MIS report.');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error uploading file');
    } finally {
      setUploadingMis(false);
    }
  };

  const copyToClipboard = async (text: string, isSbi: boolean = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isSbi) {
        setCopiedSbiMerchant(true);
        setTimeout(() => setCopiedSbiMerchant(false), 2000);
      } else {
        setCopiedKeyId(true);
        setTimeout(() => setCopiedKeyId(false), 2000);
      }
      showSuccessAlert('Copied', 'Copied to clipboard');
    } catch (e) {
      showErrorAlert('Error', 'Unable to copy');
    }
  };

  const maskedKey = (k: string) => {
    if (!k) return '';
    if (k.length <= 10) return k[0] + '***' + k.slice(-3);
    return `${k.slice(0, 4)}...${k.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonForm fields={4} />
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
                  Payment Gateways & Collection Settings
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Configure multi-gateway collection (Razorpay and SBIePay) for student fee processing
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`px-3 py-1 font-semibold text-xs ${configured ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                  Razorpay: {configured ? 'Ready' : 'Not Configured'}
                </Badge>
                <Badge className={`px-3 py-1 font-semibold text-xs ${sbiConfigured ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                  SBIePay: {sbiConfigured ? 'Ready' : 'Not Configured'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Global Gateway Policy Selector */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b bg-muted/10 p-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Active Fee Collection Gateway
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which payment gateway is active for students when paying their dues and fees:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                onClick={() => isAllowed && handleSaveActiveGateway('razorpay')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  activeGateway === 'razorpay' 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border/60 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Razorpay Only</span>
                  {activeGateway === 'razorpay' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  All fee payments route exclusively through Razorpay checkout (Cards, UPI, NetBanking).
                </p>
              </div>

              <div 
                onClick={() => isAllowed && handleSaveActiveGateway('sbi_epay')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  activeGateway === 'sbi_epay' 
                    ? 'border-blue-600 bg-blue-500/5 shadow-sm' 
                    : 'border-border/60 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">SBIePay Only</span>
                  {activeGateway === 'sbi_epay' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct student payments route to State Bank of India's hosted aggregator portal.
                </p>
              </div>

              <div 
                onClick={() => isAllowed && handleSaveActiveGateway('both')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  activeGateway === 'both' 
                    ? 'border-purple-600 bg-purple-500/5 shadow-sm' 
                    : 'border-border/60 hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Both (Student Choice)</span>
                  {activeGateway === 'both' && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Students choose between Razorpay and SBIePay when clicking "Proceed to Payment".
                </p>
              </div>
            </div>

            {savingGateway && (
              <p className="text-xs text-primary animate-pulse">Saving active collection gateway...</p>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Gateways Configuration */}
        <Tabs defaultValue="sbi" className="w-full">
          <TabsList className="grid grid-cols-3 w-full sm:w-[480px]">
            <TabsTrigger value="sbi" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> SBIePay
            </TabsTrigger>
            <TabsTrigger value="razorpay" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Razorpay
            </TabsTrigger>
            <TabsTrigger value="mis" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> SBI MIS Reconcile
            </TabsTrigger>
          </TabsList>

          {/* --- TAB 1: SBIePay Configuration --- */}
          <TabsContent value="sbi" className="space-y-6 mt-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b bg-muted/10 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-blue-600" />
                    SBIePay Merchant Configuration
                  </CardTitle>
                  <Badge className={sbiConfigured ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}>
                    {sbiConfigured ? 'Configured & Active' : 'Not Configured'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {!isAllowed && (
                  <div className="p-4 border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200 rounded-xl text-sm flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Authorization Required</span>
                      <p className="mt-1 opacity-90">Only Principal and Fees Manager can configure bank credentials.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                        Merchant ID (Provided by SBI)
                      </Label>
                      <div className="flex gap-2">
                        <Input 
                          value={sbiMerchantId} 
                          onChange={(e) => { setSbiMerchantId(e.target.value); setEditingSbi(true); }}
                          placeholder="e.g. 1000003"
                          disabled={!isAllowed || (sbiConfigured && !editingSbi)}
                          className="h-11 bg-background border-border flex-1"
                        />
                        {sbiMerchantId && (
                          <Button variant="outline" onClick={() => copyToClipboard(sbiMerchantId, true)} className="h-11 px-3">
                            {copiedSbiMerchant ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        )}
                        {sbiConfigured && !editingSbi && (
                          <Button variant="ghost" onClick={() => setEditingSbi(true)} className="h-11 px-3 text-primary">
                            Replace
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                        Aggregator ID
                      </Label>
                      <Input 
                        value={sbiAggregatorId} 
                        onChange={(e) => setSbiAggregatorId(e.target.value)} 
                        placeholder="SBIEPAY"
                        disabled={!isAllowed}
                        className="h-11 bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                      Encryption Key / Secret (AES-128/256)
                    </Label>
                    <Input 
                      value={sbiEncryptionKey}
                      onChange={(e) => setSbiEncryptionKey(e.target.value)}
                      placeholder={sbiConfigured && !editingSbi ? "•••••••••••••••• (Encrypted at rest)" : "Enter 16 or 32 character AES Key provided by SBI"}
                      disabled={!isAllowed}
                      type="password"
                      className="h-11 bg-background border-border"
                    />
                    {sbiConfigured && !editingSbi && (
                      <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-emerald-500" /> Encrypted at rest via Fernet master server key.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                      Gateway Environment
                    </Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="sbi_env" 
                          value="uat" 
                          checked={sbiEnvironment === 'uat'} 
                          onChange={() => setSbiEnvironment('uat')}
                          disabled={!isAllowed}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>UAT / Sandbox (test.sbiepay.sbi)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="sbi_env" 
                          value="prod" 
                          checked={sbiEnvironment === 'prod'} 
                          onChange={() => setSbiEnvironment('prod')}
                          disabled={!isAllowed}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>Production / Live (merchant.onlinesbi.sbi)</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>All student returns undergo mandatory server-to-server double-verification before crediting.</span>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(SBI_PORTAL_URL, '_blank')}
                        className="gap-1.5 h-11"
                      >
                        SBI Portal <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        onClick={handleSaveSBI} 
                        disabled={!isAllowed || savingSbi}
                        className="bg-blue-600 text-white hover:bg-blue-700 shadow-md font-semibold h-11 px-6 w-full md:w-auto md:min-w-[150px]"
                      >
                        {savingSbi ? 'Validating...' : 'Save & Validate SBI'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- TAB 2: Razorpay Configuration (Existing) --- */}
          <TabsContent value="razorpay" className="space-y-6 mt-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b bg-muted/10 p-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Razorpay API Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Razorpay Key ID</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        value={editingRazorpay ? keyId : (configured ? maskedKey(keyId) : keyId)} 
                        onChange={(e) => { setKeyId(e.target.value); setEditingRazorpay(true); }} 
                        placeholder={configured ? maskedKey(keyId) : 'rzp_test_xxx'} 
                        disabled={!isAllowed || (configured && !editingRazorpay)} 
                        className="h-11 bg-background border-border flex-1"
                      />
                      <div className="flex gap-2 shrink-0">
                        {keyId && (
                          <Button variant="outline" onClick={() => copyToClipboard(keyId, false)} className="h-11 px-4 gap-1.5">
                            {copiedKeyId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            Copy
                          </Button>
                        )}
                        {configured && !editingRazorpay && (
                          <Button variant="ghost" onClick={() => setEditingRazorpay(true)} className="h-11 px-4 text-primary">
                            Replace
                          </Button>
                        )}
                      </div>
                    </div>
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
                        variant="outline" 
                        onClick={() => window.open(RAZORPAY_DASHBOARD, '_blank')}
                        className="gap-1.5 h-11"
                      >
                        Razorpay Dashboard <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        onClick={handleSaveRazorpay} 
                        disabled={!isAllowed || savingRazorpay} 
                        className="bg-primary text-white hover:bg-primary/90 shadow-md font-semibold h-11 px-6 w-full md:w-auto md:min-w-[150px]"
                      >
                        {savingRazorpay ? 'Saving...' : 'Save & Validate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RazorpayX Payouts Integration */}
            <Card className="border-border/50 shadow-sm mt-6">
              <CardHeader className="border-b bg-muted/10 p-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-emerald-500" />
                  RazorpayX Payouts Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                      Merchant Virtual Account Number
                    </Label>
                    <Input 
                      value={razorpayxAccountNumber} 
                      onChange={(e) => setRazorpayxAccountNumber(e.target.value)} 
                      placeholder="e.g. 456456456456" 
                      disabled={!isAllowed} 
                      className="h-11 bg-background border-border"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleSaveRazorpay} 
                      disabled={!isAllowed || savingRazorpay}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold h-11 px-6"
                    >
                      Save Payout Config
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- TAB 3: SBI MIS Daily Settlement Reconciliation --- */}
          <TabsContent value="mis" className="space-y-6 mt-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b bg-muted/10 p-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  SBI Daily Settlement MIS Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <p className="text-sm text-muted-foreground">
                  Upload the official daily settlement report (.csv) downloaded from the SBIePay Merchant Portal. 
                  The engine cross-checks ATRN, Order References, gross debited amounts, and flags discrepancies.
                </p>

                <div className="p-6 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center space-y-3 bg-muted/5">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-semibold">Select SBI Settlement Report (.csv)</p>
                    <p className="text-xs text-muted-foreground mt-1">Must contain Merchant Order No, ATRN, and Gross Amount columns</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => setMisFile(e.target.files?.[0] || null)}
                    className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                  />
                  {misFile && (
                    <p className="text-xs text-primary font-medium mt-1">Selected: {misFile.name}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleUploadMIS} 
                    disabled={!misFile || uploadingMis}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 px-6 gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingMis ? 'Reconciling File...' : 'Upload & Reconcile MIS'}
                  </Button>
                </div>

                {misResult && (
                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <h4 className="text-sm font-semibold">Reconciliation Summary:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border bg-muted/10">
                        <span className="text-xs text-muted-foreground">Total Rows</span>
                        <p className="text-lg font-bold">{misResult.total_rows}</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
                        <span className="text-xs">Matched</span>
                        <p className="text-lg font-bold">{misResult.matched_count}</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-amber-500/10 text-amber-800 dark:text-amber-200">
                        <span className="text-xs">Amount Mismatches</span>
                        <p className="text-lg font-bold">{misResult.mismatch_count}</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-rose-500/10 text-rose-800 dark:text-rose-200">
                        <span className="text-xs">Unmatched in DB</span>
                        <p className="text-lg font-bold">{misResult.unmatched_count}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentSettings;
