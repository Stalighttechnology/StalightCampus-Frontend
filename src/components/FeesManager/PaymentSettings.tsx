import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { getPaymentSettings, savePaymentSettings } from "../../utils/fees_manager_api";

const RAZORPAY_DASHBOARD = 'https://dashboard.razorpay.com/app/';
const RAZORPAY_DOCS_KEYS = 'https://razorpay.com/docs/payment-gateway/server-integration/';

const allowedRoles = ['fees_manager', 'principal'];

const PaymentSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [editing, setEditing] = useState(false);
  const [validating, setValidating] = useState(false);

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
      showSuccessAlert('Copied', 'Copied to clipboard');
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

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-5xl">
        <Card className="mb-4">
          <CardHeader className="px-4 py-4 border-b flex items-start justify-between gap-4">
            <div>
              <CardTitle>Payment Settings</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Configure Razorpay integration for your college (organization-level)</p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                {configured ? 'Configured' : 'Not Configured'}
              </div>
              <div className="text-xs text-gray-500 mt-2">Only Fees Managers and Principals can configure.</div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instructions */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle>Quick Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside mt-2 text-sm text-gray-700 space-y-2">
                  <li>Open the Razorpay Dashboard: <a className="text-primary underline" href={RAZORPAY_DASHBOARD} target="_blank" rel="noreferrer">Go to Razorpay</a>.</li>
                  <li>Sign in or create an account for your college.</li>
                  <li>In the Dashboard, go to <strong>Settings → API Keys</strong> and generate a new key pair.</li>
                  <li>Copy the <strong>Key ID</strong> and <strong>Key Secret</strong>. Paste Key ID below and paste Key Secret once — it will not be shown again.</li>
                  <li>Click <strong>Save & Validate</strong>. Our dashboard will validate the keys with Razorpay and save them for your organization only.</li>
                </ol>

                <div className="mt-4 text-xs text-gray-500">
                  Helpful links:
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li><a className="text-primary underline" href={RAZORPAY_DOCS_KEYS} target="_blank" rel="noreferrer">Razorpay docs — API keys</a></li>
                  </ul>
                </div>

                <div className="mt-4">
                  <Button variant="outline" onClick={openRazorpay}>Open Razorpay Dashboard</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle>Organization Keys</CardTitle>
              </CardHeader>
              <CardContent>
                {!isAllowed && (
                  <div className="p-4 border rounded mb-4 bg-yellow-50 text-yellow-900">You are not authorized to change payment settings. Contact your Principal or Fees Manager.</div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label>Razorpay Key ID</Label>
                    <div className="flex gap-2 items-center">
                      <Input value={editing ? keyId : (configured ? maskedKey(keyId) : keyId)} onChange={(e) => { setKeyId(e.target.value); setEditing(true); }} placeholder={configured ? maskedKey(keyId) : 'rzp_test_xxx'} disabled={!isAllowed || (configured && !editing)} />
                      {keyId && <Button variant="outline" onClick={() => copyToClipboard(keyId)}>Copy</Button>}
                      {configured && !editing && <Button variant="ghost" onClick={() => setEditing(true)}>Replace</Button>}
                    </div>
                    {configured && !editing && (
                      <div className="text-sm text-gray-500 mt-2">Stored for this organization only. Secret not shown.</div>
                    )}
                  </div>

                  <div>
                    <Label>Razorpay Key Secret</Label>
                    <Input value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder="Paste secret here - will not be shown again" disabled={!isAllowed} />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">We validate credentials by making a safe read-only API call to Razorpay.</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">Keys are stored for this organization only.</div>
                      <Button onClick={handleSave} disabled={!isAllowed || saving || loading || validating} className="bg-primary text-white">{saving || validating ? 'Saving...' : 'Save & Validate'}</Button>
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
