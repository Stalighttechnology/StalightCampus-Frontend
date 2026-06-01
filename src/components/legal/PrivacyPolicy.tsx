import React, { useState } from 'react';
import {
  Shield, ArrowLeft, Mail, ChevronDown, ChevronUp,
  UserCheck, GraduationCap, ScanFace, HeartPulse,
  CreditCard, Cookie, Share2, Database, Lock,
  Users, Eye, RefreshCw, Baby
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ColorKey = 'blue' | 'purple' | 'teal' | 'amber';

const groupColorMap: Record<ColorKey, { badge: string; dot: string }> = {
  blue: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  purple: { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  teal: { badge: 'bg-teal-50 text-teal-700', dot: 'bg-teal-600' },
  amber: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const sections = [
  {
    group: 'Who we are & who this covers',
    color: 'blue' as ColorKey,
    items: [
      {
        id: 'intro',
        icon: Shield,
        title: 'Introduction',
        summary: 'About Stalight Technologies and this policy.',
        content: (
          <p className="text-sm leading-relaxed">
            <strong>Stalight Technologies Private Limited</strong> ("we", "our", or "us") operates
            the Stalight ERP platform (also known as StalightCampus) hosted at{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs text-primary">campus.stalight.in</code>.
            This Privacy Policy explains how we collect, use, store, and protect your information when
            you use our educational and administrative services. By using the platform, you agree to the
            practices described in this policy.
          </p>
        ),
      },
      {
        id: 'scope',
        icon: Users,
        title: 'Who this policy applies to',
        summary: 'All platform users across all roles.',
        content: (
          <>
            <p className="text-sm mb-3">This policy applies to all users of the Stalight ERP platform, including:</p>
            <ul className="space-y-1 text-sm">
              {[
                'Students and prospective students',
                'Teaching Faculty and Professors',
                'Administrative Staff (HODs, Deans, Principals, COEs)',
                'Hostel Wardens and Transport Administrators',
                'Library Administrators and Fees Managers',
                'Admission Managers and Organisational Administrators',
              ].map((r, i) => (
                <li key={i} className="flex gap-3"><span className="mt-0.5 text-blue-500 shrink-0">•</span><span>{r}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-400">
              Our platform is designed for the Indian higher-education system and currently serves institutions within India only.
            </p>
          </>
        ),
      },
    ],
  },
  {
    group: 'Data we collect',
    color: 'purple' as ColorKey,
    items: [
      {
        id: 'google-data',
        icon: UserCheck,
        title: 'Google Account data',
        summary: 'Name, email, and profile picture only.',
        content: (
          <p className="text-sm leading-relaxed">
            When you authenticate using Google Sign-In, we collect your <strong>Name</strong>,{' '}
            <strong>Email Address</strong>, and <strong>Profile Picture</strong> from your Google account.
            We do not access your Google Drive, Gmail, Calendar, or any other Google services beyond
            basic profile information.
          </p>
        ),
      },
      {
        id: 'academic-data',
        icon: GraduationCap,
        title: 'Institutional & Academic data',
        summary: 'Grades, attendance, timetables, USN, batch.',
        content: (
          <p className="text-sm leading-relaxed">
            Information provided by you or your institution, including enrollment details
            (USN, department, batch), grades, assignment submissions, examination results,
            timetables, and attendance records.
          </p>
        ),
      },
      {
        id: 'biometric-data',
        icon: ScanFace,
        title: 'Biometric & Facial Recognition data',
        summary: 'Live facial recognition for attendance — currently active.',
        content: (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Currently live</span>
            </div>
            <p className="text-sm leading-relaxed">
              Where enabled by your institution, we collect facial recognition data and photographs
              for the sole purpose of automated attendance tracking and identity verification.
              This data is stored securely and is never shared with third parties or used for any
              purpose other than attendance. You will be informed by your institution before
              biometric data collection begins.
            </p>
          </>
        ),
      },
      {
        id: 'personal-data',
        icon: HeartPulse,
        title: 'Personal & Emergency data',
        summary: 'Guardian info, medical history, emergency contacts.',
        content: (
          <p className="text-sm leading-relaxed">
            Contact details, guardian/parent information, and voluntarily provided medical history
            or emergency contact information, as submitted during admission or profile setup.
          </p>
        ),
      },
      {
        id: 'financial-data',
        icon: CreditCard,
        title: 'Financial data',
        summary: 'Fee records — no raw card numbers stored.',
        content: (
          <p className="text-sm leading-relaxed">
            Records of fee payments and transaction history. Payments are processed through a secure
            payment gateway (Razorpay/Stripe). We do not store raw credit or debit card numbers on
            our servers.
          </p>
        ),
      },
      {
        id: 'technical-data',
        icon: Cookie,
        title: 'Technical & Usage data',
        summary: 'HTTP-Only cookies and sessionStorage for UI state.',
        content: (
          <p className="text-sm leading-relaxed">
            We use <strong>HTTP-Only cookies</strong> for secure session management (authentication
            token refresh). We also use browser{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">sessionStorage</code> to
            maintain user role and UI state during your active session. These are cleared when
            you close your browser tab.
          </p>
        ),
      },
    ],
  },
  {
    group: 'How we use & share data',
    color: 'teal' as ColorKey,
    items: [
      {
        id: 'usage',
        icon: Eye,
        title: 'How we use your information',
        summary: 'Only to operate and improve the ERP platform.',
        content: (
          <ul className="space-y-2 text-sm">
            {[
              'Authenticating your identity securely via Google Sign-In.',
              'Managing academic workflows such as assignment submission, grading, and examination results.',
              'Recording and managing attendance, including biometric/facial recognition attendance where enabled.',
              'Facilitating campus operations including hostel management, library tracking, and transportation.',
              'Processing and tracking fee payments and generating receipts.',
              'Sending push notifications via Firebase Cloud Messaging (FCM) for academic announcements, fee reminders, and institutional updates.',
              'Storing uploaded documents and profile pictures securely via Cloudflare R2.',
            ].map((u, i) => (
              <li key={i} className="flex gap-3"><span className="mt-0.5 text-teal-600 shrink-0">•</span><span>{u}</span></li>
            ))}
          </ul>
        ),
      },
      {
        id: 'sharing',
        icon: Share2,
        title: 'How we share your information',
        summary: 'Never sold. Limited to institution & trusted providers.',
        content: (
          <>
            <p className="text-sm mb-3 font-medium text-gray-800">We do not sell, rent, or trade your personal data to any third parties.</p>
            <p className="text-sm mb-3">Your data is shared only in the following limited circumstances:</p>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="mt-0.5 text-teal-600 shrink-0">•</span>
                <span><strong>Within your institution:</strong> Only authorised personnel (faculty, HOD, Dean, admin staff) as required for official duties.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-teal-600 shrink-0">•</span>
                <div>
                  <strong>Trusted service providers</strong> bound by data processing agreements:
                  <ul className="mt-2 space-y-1 pl-2">
                    {[
                      ['Cloudflare R2', 'secure file and document storage'],
                      ['Firebase Cloud Messaging (FCM)', 'push notifications'],
                      ['Razorpay / Stripe', 'fee payment processing'],
                      ['Google', 'authentication via Google Sign-In'],
                    ].map(([name, desc]) => (
                      <li key={name} className="flex gap-2 text-xs text-gray-500">
                        <span className="shrink-0 font-medium text-gray-700">{name}</span>
                        <span>— {desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-teal-600 shrink-0">•</span>
                <span><strong>Legal requirements:</strong> If required by law or valid legal process.</span>
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    group: 'Retention, rights & security',
    color: 'amber' as ColorKey,
    items: [
      {
        id: 'retention',
        icon: Database,
        title: 'Data retention',
        summary: 'Academic records kept permanently; biometrics deleted on exit.',
        content: (
          <ul className="space-y-2 text-sm">
            <li className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span><strong>Academic records</strong> (grades, degrees, transcripts, attendance) are retained permanently to support alumni verification, regulatory compliance, and re-issuance of certificates.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span><strong>Non-essential application data</strong> is retained until the institution formally requests deletion or the contract with Stalight Technologies is terminated.</span></li>
            <li className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span><strong>Biometric data</strong> is retained for the duration of the student's enrolment and deleted upon graduation or request by the institution.</span></li>
          </ul>
        ),
      },
      {
        id: 'minors',
        icon: Baby,
        title: 'Users under 18',
        summary: 'Handled under institutional authority in loco parentis.',
        content: (
          <p className="text-sm leading-relaxed">
            Stalight ERP is primarily designed for higher-education institutions with adult users.
            However, we recognise that some first-year college or diploma students may be under 18.
            For such users, data collection and processing is authorised by the educational institution
            acting in loco parentis. We do not knowingly collect personal data from minors outside
            of this institutional context.
          </p>
        ),
      },
      {
        id: 'security',
        icon: Lock,
        title: 'Data security',
        summary: 'RBAC, encrypted storage, HTTP-Only cookies.',
        content: (
          <p className="text-sm leading-relaxed">
            We implement industry-standard security measures including role-based access control,
            encrypted data storage, HTTP-Only cookies for session tokens, and secure cloud hosting
            to protect your personal and academic information against unauthorised access,
            alteration, or destruction.
          </p>
        ),
      },
      {
        id: 'rights',
        icon: UserCheck,
        title: 'Your rights & data deletion',
        summary: 'Access, correct, or request deletion of non-essential data.',
        content: (
          <>
            <p className="text-sm mb-3">
              Because Stalight ERP manages regulated academic and financial records, students cannot
              unilaterally delete their own academic or financial records. However, you have the right to:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span>Request access to the personal data we hold about you.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span>Request correction of inaccurate personal data.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-amber-600 shrink-0">•</span><span>Request deletion of non-essential personal data (e.g., profile pictures, contact details) by contacting your institution's administrator or emailing us directly.</span></li>
            </ul>
            <p className="mt-3 text-xs text-gray-400">
              All deletion requests must be routed through your institution's administration or submitted via email to our support address below.
            </p>
          </>
        ),
      },
      {
        id: 'changes',
        icon: RefreshCw,
        title: 'Changes to this policy',
        summary: 'Updates posted here with a revised effective date.',
        content: (
          <p className="text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. Any changes will be posted on this
            page with an updated effective date. Continued use of the platform after changes are posted
            constitutes your acceptance of the revised policy.
          </p>
        ),
      },
    ],
  },
];

const AccordionItem = ({
  item,
  color,
  isOpen,
  onToggle,
}: {
  item: { id: string; icon: React.ElementType; title: string; summary: string; content: React.ReactNode };
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
          <span className="font-semibold text-gray-900 text-sm block">{item.title}</span>
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

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const allIds = sections.flatMap(g => g.items.map(i => i.id));
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['intro']));

  const toggle = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenItems(new Set(allIds));
  const collapseAll = () => setOpenItems(new Set());

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-gray-900 mb-8 transition-colors text-sm gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Hero */}
        <div className="bg-primary rounded-2xl px-8 py-10 text-white flex flex-col items-center text-center mb-8">
          <div className="bg-white/20 p-4 rounded-full mb-5">
            <Shield className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
          <p className="text-white/70 text-sm mb-4">Effective Date: June 1, 2026</p>
          <p className="text-white/80 text-sm max-w-lg">
            Operated by <strong>Stalight Technologies Private Limited</strong> at{' '}
            <code className="bg-white/20 px-1.5 py-0.5 rounded text-xs">campus.stalight.in</code>.
            This policy explains how we collect, use, store, and protect your data.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Data categories', value: '6' },
            { label: 'Data sold?', value: 'Never' },
            { label: 'Geography', value: 'India only' },
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
            const colors = groupColorMap[group.color];
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
                      color={group.color}
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
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Contact Us</h3>
            <p className="text-sm text-gray-500 mb-2">
              For questions, concerns, or data requests regarding this Privacy Policy:
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

export default PrivacyPolicy;