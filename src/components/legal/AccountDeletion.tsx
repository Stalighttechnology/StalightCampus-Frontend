import React, { useState } from 'react';
import {
  Trash2, ArrowLeft, Mail, ChevronDown, ChevronUp,
  UserX, Database, History, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ColorKey = 'red' | 'blue' | 'amber';

const groupColorMap: Record<ColorKey, { badge: string; dot: string }> = {
  red: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  blue: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  amber: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const sections = [
  {
    group: 'Process & Requirements',
    color: 'blue' as ColorKey,
    items: [
      {
        id: 'how-to',
        icon: UserX,
        title: 'How to Request Deletion',
        summary: 'Steps to submit an account deletion request.',
        content: (
          <>
            <p className="text-sm mb-3">Users may request deletion of their account and associated personal data by following these steps:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-3"><span className="mt-0.5 text-blue-600 shrink-0">1.</span><span>Contact your institution administrator directly, OR</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-blue-600 shrink-0">2.</span><span>Log in to your Stalight Campus account and navigate to Profile Settings, if available, OR</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-blue-600 shrink-0">3.</span><span>Send an email to <strong>support@stalight.in</strong> with the subject "Account Deletion Request".</span></li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
              <strong>Note:</strong> When emailing, please include your registered email address, institution name, and user ID (if available) to help us locate your account.
            </p>
          </>
        ),
      },
    ],
  },
  {
    group: 'Data Handling',
    color: 'red' as ColorKey,
    items: [
      {
        id: 'data-deleted',
        icon: Trash2,
        title: 'Data Deleted',
        summary: 'Information that will be permanently removed.',
        content: (
          <>
            <p className="text-sm mb-3">Upon successful verification and approval of the request, the following data may be deleted:</p>
            <ul className="space-y-2 text-sm">
              {[
                'User profile information',
                'Login credentials',
                'Personal account information',
                'User-generated preferences and settings',
              ].map((item, i) => (
                <li key={i} className="flex gap-3"><span className="mt-0.5 text-red-500 shrink-0">•</span><span>{item}</span></li>
              ))}
            </ul>
          </>
        ),
      },
      {
        id: 'data-retained',
        icon: Database,
        title: 'Data That May Be Retained',
        summary: 'Records kept for legal or institutional purposes.',
        content: (
          <>
            <p className="text-sm mb-3">Certain records may be retained for legal, security, audit, compliance, academic, or institutional record-keeping purposes, including:</p>
            <ul className="space-y-2 text-sm">
              {[
                'Attendance records',
                'Academic records',
                'Administrative logs',
                'Compliance and security logs',
              ].map((item, i) => (
                <li key={i} className="flex gap-3"><span className="mt-0.5 text-red-500 shrink-0">•</span><span>{item}</span></li>
              ))}
            </ul>
          </>
        ),
      },
    ],
  },
  {
    group: 'Policies',
    color: 'amber' as ColorKey,
    items: [
      {
        id: 'retention-period',
        icon: History,
        title: 'Retention Period',
        summary: 'How long retained data is stored.',
        content: (
          <p className="text-sm leading-relaxed">
            Data retained for legal or institutional purposes may be stored for the period required by applicable laws, regulations, or institutional policies.
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

const AccountDeletion = () => {
  const navigate = useNavigate();
  const allIds = sections.flatMap(g => g.items.map(i => i.id));
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['how-to', 'data-deleted']));

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
        <div className="bg-red-600 rounded-2xl px-8 py-10 text-white flex flex-col items-center text-center mb-8">
          <div className="bg-white/20 p-4 rounded-full mb-5">
            <Trash2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Account & Data Deletion</h1>
          <p className="text-white/80 text-sm max-w-lg">
            Information and procedures for requesting the deletion of your Stalight Campus account and associated personal data.
          </p>
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
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Need Assistance?</h3>
            <p className="text-sm text-gray-500 mb-2">
              For assistance with your account deletion request, please contact:
            </p>
            <a href="mailto:support@stalight.in" className="text-sm text-primary font-medium hover:underline">
              support@stalight.in
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountDeletion;
