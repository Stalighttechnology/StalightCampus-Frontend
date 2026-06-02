import React, { useState } from 'react';
import {
  FileText, ArrowLeft, Mail, ChevronDown, ChevronUp,
  Shield, Users, CreditCard, Bell, Upload, Code2,
  UserX, Scale, AlertTriangle, RefreshCw, ScanFace, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    group: 'Access & Identity',
    color: 'blue',
    items: [
      {
        id: 1,
        icon: Users,
        title: 'Authorized Use',
        summary: 'Who can use the platform and for what purpose.',
        content: (
          <>
            <p className="mb-3">
              Stalight ERP is an educational and administrative platform designed exclusively for
              Indian higher-education institutions. Access is granted strictly for official academic,
              administrative, or institutional purposes.
            </p>
            <p className="text-sm text-gray-500">
              Supported roles: Students, Faculty, HODs, Deans, Principals, Wardens,
              Transport Administrators, Library Administrators, Fees Managers, Admission Managers,
              and Organisational Administrators. Each role is scoped to modules relevant to their
              official duties only.
            </p>
          </>
        ),
      },
      {
        id: 2,
        icon: Lock,
        title: 'Google Sign-In & Account Security',
        summary: 'Authentication, sessions, and credential responsibilities.',
        content: (
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span><strong>Authentication:</strong> Sign in using your official institutional email. Personal Gmail accounts not authorised by your institution may result in restricted access.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span><strong>Session Security:</strong> Sessions are maintained using HTTP-Only cookies for secure token management. Do not tamper with, copy, or share session tokens.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span><strong>Confidentiality:</strong> You are responsible for your account. Immediately notify your institutional administrator of any suspected unauthorised access.</span></li>
          </ul>
        ),
      },
      {
        id: 3,
        icon: ScanFace,
        title: 'Biometric Data & Facial Recognition',
        summary: 'Live facial recognition consent and data handling.',
        content: (
          <>
            <p className="mb-3 text-sm">
              Stalight ERP includes a live facial recognition attendance system. Where your institution
              has enabled this feature:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span>You acknowledge and consent to your facial data being collected and processed solely for automated attendance marking and identity verification.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span>Your biometric data will not be shared with any third party or used beyond attendance and identity verification on this platform.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span>You may contact your institution's administration to request deletion of biometric data upon completion of your enrolment.</span></li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    group: 'Platform Conduct',
    color: 'purple',
    items: [
      {
        id: 4,
        icon: Shield,
        title: 'Acceptable Conduct',
        summary: 'What you must not do while using the platform.',
        content: (
          <>
            <p className="mb-3 text-sm">
              While using Stalight ERP — including assignments, file uploads, chat, and all other
              modules — you agree <strong>not</strong> to:
            </p>
            <ul className="space-y-2 text-sm">
              {[
                'Upload or transmit malicious code, viruses, ransomware, or disruptive files.',
                "Exploit, reverse-engineer, hack, or gain unauthorised access to other users' data, grading systems, fee records, or administrative modules.",
                'Manipulate, falsify, or tamper with attendance records, examination results, or academic submissions.',
                'Share, sell, or redistribute account credentials or provide access to unauthorised individuals.',
                'Post, upload, or distribute offensive, defamatory, obscene, or inappropriate content through any module.',
                'Use the platform for any activity that violates applicable Indian law, including the Information Technology Act, 2000.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3"><span className="mt-0.5 text-purple-500 shrink-0">•</span><span>{item}</span></li>
              ))}
            </ul>
          </>
        ),
      },
      {
        id: 5,
        icon: Upload,
        title: 'File Uploads & Document Storage',
        summary: 'Your responsibilities for content you upload.',
        content: (
          <>
            <p className="mb-3 text-sm">
              Files, documents, and images (including profile pictures, assignment submissions,
              and official documents) are stored securely via <strong>Cloudflare R2</strong>.
              By uploading content, you confirm that:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-0.5 text-purple-500 shrink-0">•</span><span>You have the right to upload and share the content.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-purple-500 shrink-0">•</span><span>The content does not violate any applicable law, intellectual property rights, or these Terms.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-purple-500 shrink-0">•</span><span>Stalight Technologies reserves the right to remove any uploaded content that violates these Terms, without prior notice.</span></li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    group: 'Services & Transactions',
    color: 'teal',
    items: [
      {
        id: 6,
        icon: CreditCard,
        title: 'Payments & Fee Transactions',
        summary: 'Online fee payments via Razorpay / Stripe.',
        content: (
          <>
            <p className="mb-3 text-sm">
              Fee payments are processed through a secure third-party payment gateway (Razorpay or Stripe).
              By initiating a payment, you agree that:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-0.5 text-teal-600 shrink-0">•</span><span>All fee amounts are set by your institution. Stalight Technologies is not responsible for fee structures, refunds, or disputes.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-teal-600 shrink-0">•</span><span>Transaction records are maintained permanently for audit and verification purposes.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-teal-600 shrink-0">•</span><span>In case of a failed transaction, verify payment status in the platform before re-attempting, to avoid duplicate payments.</span></li>
            </ul>
          </>
        ),
      },
      {
        id: 7,
        icon: Bell,
        title: 'Push Notifications',
        summary: 'FCM notifications for academic and institutional updates.',
        content: (
          <p className="text-sm">
            The platform uses <strong>Firebase Cloud Messaging (FCM)</strong> to deliver push
            notifications for academic announcements, fee reminders, attendance alerts, and other
            institutional communications. By registering your device on the platform, you consent
            to receiving these notifications. You may manage notification preferences through your
            device settings at any time.
          </p>
        ),
      },
    ],
  },
  {
    group: 'Legal & Ownership',
    color: 'amber',
    items: [
      {
        id: 8,
        icon: Code2,
        title: 'Intellectual Property',
        summary: 'Ownership of software, design, and infrastructure.',
        content: (
          <p className="text-sm">
            All software, design, codebase, and infrastructure of the Stalight ERP platform are the
            exclusive intellectual property of <strong>Stalight Technologies Private Limited</strong>.
            You may not copy, modify, decompile, reverse-engineer, or distribute any part of the
            platform or its underlying software without explicit written permission.
          </p>
        ),
      },
      {
        id: 9,
        icon: UserX,
        title: 'Account Suspension & Termination',
        summary: 'When and why access may be revoked.',
        content: (
          <>
            <p className="mb-3 text-sm">
              Access may be suspended or permanently terminated, with or without prior notice, in these circumstances:
            </p>
            <ul className="space-y-2 text-sm">
              {[
                'Violation of any provision of these Terms of Service.',
                "Violation of your institution's code of conduct.",
                'Completion of your academic programme or departure from the institution.',
                'Detection of fraudulent activity, security breaches, or misuse of any platform module.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span>{item}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-400">
              Academic records will be retained permanently after account suspension for institutional compliance and alumni verification.
            </p>
          </>
        ),
      },
      {
        id: 10,
        icon: Scale,
        title: 'Governing Law & Jurisdiction',
        summary: 'Indian law governs these Terms.',
        content: (
          <p className="text-sm">
            These Terms shall be governed by and construed in accordance with the laws of India,
            including the Information Technology Act, 2000 and the Digital Personal Data Protection
            Act, 2023. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.
          </p>
        ),
      },
      {
        id: 11,
        icon: AlertTriangle,
        title: 'Disclaimer of Warranties',
        summary: 'Platform is provided "as is" without guarantees.',
        content: (
          <p className="text-sm">
            While we strive for maximum uptime and data accuracy, the platform is provided on an
            "as is" and "as available" basis. Stalight Technologies does not warrant that the service
            will be entirely uninterrupted, error-free, or free from security vulnerabilities.
            Scheduled maintenance windows will be communicated to institutions in advance wherever possible.
          </p>
        ),
      },
      {
        id: 12,
        icon: RefreshCw,
        title: 'Changes to These Terms',
        summary: 'How we notify you of updates.',
        content: (
          <p className="text-sm">
            Stalight Technologies reserves the right to update or modify these Terms at any time.
            Updated Terms will be posted at this URL with a revised effective date. Continued use
            of the platform after changes are posted constitutes your acceptance of the revised Terms.
          </p>
        ),
      },
    ],
  },
];

type ColorKey = 'blue' | 'purple' | 'teal' | 'amber';

const groupColorMap: Record<ColorKey, { badge: string; dot: string }> = {
  blue: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  purple: { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  teal: { badge: 'bg-teal-50 text-teal-700', dot: 'bg-teal-600' },
  amber: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const AccordionItem = ({
  item,
  color,
  isOpen,
  onToggle,
}: {
  item: { id: number; icon: React.ElementType; title: string; summary: string; content: React.ReactNode };
  color: ColorKey;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const Icon = item.icon;
  const colors = groupColorMap[color];

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isOpen ? 'border-gray-200 shadow-sm' : 'border-gray-100'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`p-2 rounded-lg ${colors.badge} shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 text-sm block">{item.id}. {item.title}</span>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{item.summary}</p>
        </div>
        <div className="shrink-0 text-gray-400">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-white text-gray-600 leading-relaxed">
          {item.content}
        </div>
      )}
    </div>
  );
};

const TermsOfService = () => {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([1]));

  const toggle = (id: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allIds = sections.flatMap(g => g.items.map(i => i.id));
  const expandAll = () => setOpenItems(new Set(allIds));
  const collapseAll = () => setOpenItems(new Set());

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-400 hover:text-gray-900 mb-8 transition-colors text-sm gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        {/* Hero */}
        <div className="bg-primary rounded-2xl px-8 py-10 text-white flex flex-col items-center text-center mb-8">
          <div className="bg-white/20 p-4 rounded-full mb-5">
            <FileText className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold mb-1">Terms of Service</h1>
          <p className="text-white/70 text-sm mb-4">Effective Date: June 1, 2026</p>
          <p className="text-white/80 text-sm max-w-lg">
            By accessing{' '}
            <code className="bg-white/20 px-1.5 py-0.5 rounded text-xs">campus.stalight.in</code>,
            you agree to these Terms as set out by <strong>Stalight Technologies Private Limited</strong>.
            If you do not agree, please do not use the platform.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Sections', value: '13' },
            { label: 'Governing law', value: 'India' },
            { label: 'Data scope', value: 'India only' },
            { label: 'Last updated', value: 'Jun 2026' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
              <p className="text-base font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">Click any section to expand</p>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
              Expand all
            </button>
            <button onClick={collapseAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
              Collapse all
            </button>
          </div>
        </div>

        {/* Grouped accordion */}
        <div className="space-y-8">
          {sections.map(group => {
            const colors = groupColorMap[group.color as ColorKey];
            return (
              <div key={group.group}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {group.group}
                  </h2>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <AccordionItem
                      key={item.id}
                      item={item}
                      color={group.color as ColorKey}
                      isOpen={openItems.has(item.id)}
                      onToggle={() => toggle(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact footer */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-4">
          <div className="bg-gray-100 p-3 rounded-xl shrink-0">
            <Mail className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">13. Contact Information</h3>
            <p className="text-sm text-gray-500 mb-2">
              For technical support, legal queries, or questions regarding these Terms:
            </p>
            <p className="text-sm font-medium text-gray-700">Stalight Technologies Private Limited</p>
            <a href="mailto:stalighttechnologies@gmail.com" className="text-sm text-primary font-medium hover:underline">
              stalighttechnologies@gmail.com
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TermsOfService;