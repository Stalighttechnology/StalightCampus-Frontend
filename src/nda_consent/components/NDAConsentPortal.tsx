import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { submitNDAConsent } from '../services/ndaConsentApi';
import './NDAConsent.css';

// ESM/CJS interop for SignatureCanvas in production build
// @ts-ignore
const SignatureCanvasComponent = (SignatureCanvas as any).default || SignatureCanvas;

// ── Types ──────────────────────────────────────────────────────────
interface FormData {
  full_name: string; role: string; department: string; designation: string;
  employee_intern_id: string; date_of_joining: string; personal_email: string;
  phone: string; address: string; emergency_contact: string;
  agreed_to_nda: boolean; consent_data_processing: boolean;
  consent_background_verification: boolean; consent_photo_video: boolean;
  consent_communication: boolean; consent_device_monitoring: boolean;
  agreed_to_ip_assignment: boolean; pre_existing_ip: string;
  agreed_to_code_of_conduct: boolean; agreed_to_leave_policy: boolean;
  signature_image: string;
}

const initialData: FormData = {
  full_name: '', role: 'EMPLOYEE', department: '', designation: '',
  employee_intern_id: '', date_of_joining: '', personal_email: '',
  phone: '', address: '', emergency_contact: '',
  agreed_to_nda: false, consent_data_processing: false,
  consent_background_verification: false, consent_photo_video: false,
  consent_communication: false, consent_device_monitoring: false,
  agreed_to_ip_assignment: false, pre_existing_ip: '',
  agreed_to_code_of_conduct: false, agreed_to_leave_policy: false,
  signature_image: '',
};

// ── Step labels for the progress bar ──────────────────────────────
const STEPS = ['Details','NDA','Consents','IP','Conduct','Leave','Sign','Review'];

// ── Reusable field components ──────────────────────────────────────
const Field: React.FC<{
  label: string; required?: boolean; optional?: boolean; hint?: string; error?: string; children: React.ReactNode;
}> = ({ label, required, optional, hint, error, children }) => (
  <div className="nda-field">
    <label className="nda-label">
      {label}
      {required && <span className="nda-required">*</span>}
      {optional && <span className="nda-optional">(optional)</span>}
    </label>
    {children}
    {hint && <div className="nda-hint">{hint}</div>}
    {error && <div className="nda-field-error">{error}</div>}
  </div>
);

// ── Consent Checkbox card ──────────────────────────────────────────
const ConsentCard: React.FC<{
  checked: boolean; onChange: () => void; title: string; desc: string;
  required?: boolean; optional?: boolean;
}> = ({ checked, onChange, title, desc, required, optional }) => (
  <div className={`nda-consent-item${checked ? ' checked' : ''}${optional ? ' optional' : ''}`} onClick={onChange}>
    <div className={`nda-consent-cb${checked ? ' checked' : ''}`} />
    <div className="nda-consent-text">
      <strong>
        {title}
        {required && <span className="nda-consent-badge badge-required">Required</span>}
        {optional && <span className="nda-consent-badge badge-optional">Optional</span>}
      </strong>
      <span>{desc}</span>
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────
export const NDAConsentPortal: React.FC = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(initialData);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [sigIsEmpty, setSigIsEmpty] = useState(true);

  const sigCanvas = useRef<SignatureCanvas>(null);

  const next = () => { setError(''); setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const t = e.target as HTMLInputElement;
    const val = t.type === 'checkbox' ? t.checked : t.value;
    setData(d => ({ ...d, [field]: val }));
    if (fieldErrors[field]) setFieldErrors(fe => ({ ...fe, [field]: '' }));
  };

  const toggle = (field: keyof FormData) => () => {
    setData(d => ({ ...d, [field]: !d[field] }));
  };

  // ── Step 1 validation ──────────────────────────────────────────
  const validateStep1 = () => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!data.full_name.trim()) errs.full_name = 'Full name is required';
    if (!data.department.trim()) errs.department = 'Department is required';
    if (!data.designation.trim()) errs.designation = 'Designation is required';
    if (!data.date_of_joining) errs.date_of_joining = 'Date of joining is required';
    if (!data.personal_email.trim()) errs.personal_email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personal_email)) errs.personal_email = 'Invalid email format';
    if (!data.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(data.phone)) errs.phone = 'Invalid phone number';
    if (!data.address.trim()) errs.address = 'Address is required';
    if (!data.emergency_contact.trim()) errs.emergency_contact = 'Emergency contact is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 3 validation ──────────────────────────────────────────
  const validateStep3 = () => {
    if (!data.consent_data_processing || !data.consent_background_verification ||
        !data.consent_communication || !data.consent_device_monitoring) {
      setError('Please agree to all required consents to continue.');
      return false;
    }
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!data.signature_image) {
      setError('Signature is missing. Please go back to Step 7 and draw your signature.');
      return;
    }
    const msgs = [
      'Saving your details...', 'Generating signed PDF...', 'Applying SHA-256 hash...', 'Sending emails...', 'Almost done...'
    ];
    let idx = 0;
    setLoadingMsg(msgs[0]);
    const t = setInterval(() => { idx = (idx + 1) % msgs.length; setLoadingMsg(msgs[idx]); }, 4000);
    try {
      setLoading(true); setError('');
      const res = await submitNDAConsent(data);
      clearInterval(t);
      setSubmissionResult(res); setSuccess(true); setPdfUrl(res.pdf_url);
    } catch (err: any) {
      clearInterval(t);
      setError(err.message || 'Submission failed. Please try again.');
    } finally { setLoading(false); setLoadingMsg(''); }
  };

  // ── Step header ────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="nda-card-header">
      <div className="nda-card-header-content">
        <div className="nda-card-title">NDA &amp; Consent Portal</div>
        <div className="nda-card-subtitle">Stalight Technologies Pvt Ltd · Digital Onboarding Agreement</div>
        <div className="nda-progress-bar" style={{ marginTop: 18 }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step; const active = n === step;
            return (
              <React.Fragment key={n}>
                <div className={`nda-step-dot ${done ? 'done' : active ? 'active' : 'pending'}`} title={label}>
                  {done ? '✓' : n}
                </div>
                {i < STEPS.length - 1 && <div className={`nda-step-line ${n < step ? 'done' : ''}`} />}
              </React.Fragment>
            );
          })}
        </div>
        <div className="nda-step-label">{STEPS[step - 1]} · Step {step} of {STEPS.length}</div>
      </div>
    </div>
  );

  // ── Success screen ─────────────────────────────────────────────
  if (success) return (
    <div className="nda-portal-wrapper">
      <div className="nda-card">
        {renderHeader()}
        <div className="nda-card-body nda-success">
          <div className="nda-success-icon">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>
          </div>
          <div className="nda-success-title">Submission Received!</div>
          <div className="nda-success-sub">
            We are verifying your details and will send the countersigned NDA document to <strong>{data.personal_email}</strong> once approved.
          </div>
          {submissionResult && (
            <div className="nda-success-info">
              <div className="nda-success-info-row">
                <span>Document ID</span><span>{submissionResult.document_id}</span>
              </div>
              <div className="nda-success-info-row">
                <span>Your ID</span><span>{submissionResult.employee_intern_id}</span>
              </div>
              <div className="nda-success-info-row">
                <span>Role</span><span>{data.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Error alert ────────────────────────────────────────────────
  const errorAlert = error ? (
    <div className="nda-alert-error">
      <div className="nda-alert-error-title">Please fix the following:</div>
      {error.split('\n').map((l, i) => <div key={i}>{l}</div>)}
    </div>
  ) : null;

  return (
    <div className="nda-portal-wrapper">
      <div className="nda-card">
        {renderHeader()}

        <div className="nda-card-body">
          {errorAlert}

          {/* ── STEP 1: Joinee Details ──────────────────────────── */}
          {step === 1 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Joinee Details
              </div>
              <div className="nda-section-desc">Please fill in your personal and joining information accurately.</div>
              <div className="nda-divider" />

              <div className="nda-form-grid">
                <Field label="Full Name" required error={fieldErrors.full_name}>
                  <input className={`nda-input${fieldErrors.full_name ? ' error' : ''}`}
                    type="text" placeholder="e.g., Ritesh Nair" value={data.full_name} onChange={set('full_name')} />
                </Field>
                <Field label="Role" required>
                  <select className="nda-select" value={data.role} onChange={set('role')}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </Field>
                <Field label="Department" required error={fieldErrors.department}>
                  <input className={`nda-input${fieldErrors.department ? ' error' : ''}`}
                    type="text" placeholder="e.g., Engineering" value={data.department} onChange={set('department')} />
                </Field>
                <Field label="Designation" required error={fieldErrors.designation}>
                  <input className={`nda-input${fieldErrors.designation ? ' error' : ''}`}
                    type="text" placeholder="e.g., Software Developer" value={data.designation} onChange={set('designation')} />
                </Field>

                <Field label="Date of Joining" required error={fieldErrors.date_of_joining}>
                  <input className={`nda-input${fieldErrors.date_of_joining ? ' error' : ''}`}
                    type="date" value={data.date_of_joining} onChange={set('date_of_joining')} />
                </Field>
                <Field label="Personal Email" required error={fieldErrors.personal_email}>
                  <input className={`nda-input${fieldErrors.personal_email ? ' error' : ''}`}
                    type="email" placeholder="you@example.com" value={data.personal_email} onChange={set('personal_email')} />
                </Field>
                <Field label="Phone Number" required error={fieldErrors.phone}>
                  <input className={`nda-input${fieldErrors.phone ? ' error' : ''}`}
                    type="tel" placeholder="+91 98765 43210" value={data.phone} onChange={set('phone')} />
                </Field>
                <Field label="Address" required error={fieldErrors.address} >
                  <textarea className={`nda-textarea${fieldErrors.address ? ' error' : ''}`}
                    placeholder="Current residential address" value={data.address} onChange={set('address')} style={{ gridColumn: 'span 2' }} />
                </Field>
                <Field label="Emergency Contact" required error={fieldErrors.emergency_contact} hint="Name and phone number">
                  <input className={`nda-input${fieldErrors.emergency_contact ? ' error' : ''}`}
                    type="text" placeholder="e.g., Parent — 9876543210" value={data.emergency_contact} onChange={set('emergency_contact')} />
                </Field>
              </div>

              <div className="nda-btn-row" style={{ justifyContent: 'flex-end' }}>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (validateStep1()) { setError(''); next(); }
                }}>Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: NDA ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Non-Disclosure Agreement
              </div>
              <div className="nda-section-desc">
                Please read the NDA carefully. Scroll through the full document before agreeing.
              </div>
              <div className="nda-divider" />
              <div className="nda-doc-box">
                <p>This Non-Disclosure Agreement (<strong>"NDA"</strong>) is entered into by and between <strong>Stalight Technologies Pvt Ltd</strong> ("Company") and <strong>{data.full_name || 'the Joinee'}</strong> ("Recipient").</p>
                <p><strong>1. Confidential Information</strong><br />
                  Includes but is not limited to: source code, technical architectures, business and financial plans, client and vendor lists, pricing strategies, unreleased products, internal processes, trade secrets, and any other information designated as confidential.</p>
                <p><strong>2. Obligations</strong><br />
                  The Recipient agrees not to disclose, copy, reproduce, or use Confidential Information outside of their work duties with the Company. Upon termination or request, all materials must be returned or destroyed.</p>
                <p><strong>3. Exclusions</strong><br />
                  Information that is already in the public domain, independently developed without reference to Confidential Information, known prior to disclosure, or required to be disclosed by applicable law.</p>
                <p><strong>4. Survival</strong><br />
                  Confidentiality obligations survive termination indefinitely for trade secrets, and for 3 (three) years for all other Confidential Information.</p>
                <p><strong>5. Remedies</strong><br />
                  The Recipient acknowledges that breach of this Agreement may cause irreparable harm entitling the Company to seek injunctive relief in addition to other legal remedies.</p>
                <p><strong>6. Governing Law</strong><br />
                  This Agreement is governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.</p>
              </div>
              <ConsentCard
                checked={data.agreed_to_nda}
                onChange={toggle('agreed_to_nda')}
                title="I have read and agree to the NDA"
                desc="I acknowledge I have read and understood the Non-Disclosure Agreement in full and agree to be bound by its terms."
                required
              />
              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back}>← Back</button>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (!data.agreed_to_nda) { setError('You must agree to the NDA to continue.'); return; }
                  next();
                }} disabled={!data.agreed_to_nda}>Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Consent Declarations ────────────────────── */}
          {step === 3 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Consent Declarations
              </div>
              <div className="nda-section-desc">
                Please review and provide your consent for the following. All items marked Required must be agreed to continue.
              </div>
              <div className="nda-divider" />
              <div className="nda-consent-list">
                <ConsentCard checked={data.consent_data_processing} onChange={toggle('consent_data_processing')} required
                  title="Data Processing Consent"
                  desc="Consent to process personal data (ID documents, bank details, etc.) for employment purposes under the Digital Personal Data Protection Act, 2023." />
                <ConsentCard checked={data.consent_background_verification} onChange={toggle('consent_background_verification')} required
                  title="Background Verification"
                  desc="Consent to conduct background verification checks including education, previous employment, and criminal record checks." />
                <ConsentCard checked={data.consent_communication} onChange={toggle('consent_communication')} required
                  title="Official Communication"
                  desc="Consent to receive official company communications via email, SMS, and WhatsApp." />
                <ConsentCard checked={data.consent_device_monitoring} onChange={toggle('consent_device_monitoring')} required
                  title="Device & IT Monitoring"
                  desc="Consent to acceptable use of company-issued devices and acknowledgement that device activity may be monitored per IT policy." />
                <ConsentCard checked={data.consent_photo_video} onChange={toggle('consent_photo_video')} optional
                  title="Photo / Video Usage"
                  desc="Consent to use your photo or video for company directories, internal communications, and marketing materials." />
              </div>
              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back}>← Back</button>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (validateStep3()) next();
                }}>Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 4: IP Assignment ────────────────────────────── */}
          {step === 4 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Intellectual Property Assignment
              </div>
              <div className="nda-section-desc">
                All IP created during your engagement with the Company is automatically assigned to the Company.
              </div>
              <div className="nda-divider" />
              <div className="nda-doc-box">
                <p><strong>Assignment:</strong> All intellectual property including copyright, patents, designs, trademarks, source code, and inventions created in the course of or in connection with the Joinee's engagement with the Company shall be automatically assigned to and owned by the Company.</p>
                <p><strong>Moral Rights:</strong> The Joinee agrees not to exercise moral rights under the Indian Copyright Act, 1957 in any manner that conflicts with the Company's ownership or use of the work.</p>
                <p><strong>Annexure A — Pre-existing IP:</strong> If you own any prior IP that might be relevant to your work with the Company, declare it below. Undeclared prior IP may be considered newly assigned to the Company.</p>
              </div>
              <div className="nda-field" style={{ marginBottom: 16 }}>
                <label className="nda-label">Pre-existing IP <span className="nda-optional">(optional)</span></label>
                <textarea className="nda-textarea" rows={3}
                  placeholder="E.g., Personal open-source projects, mobile apps, etc. Leave blank if none."
                  value={data.pre_existing_ip} onChange={set('pre_existing_ip')} />
                <div className="nda-hint">Leave blank if you have no pre-existing IP to declare.</div>
              </div>
              <ConsentCard checked={data.agreed_to_ip_assignment} onChange={toggle('agreed_to_ip_assignment')} required
                title="I agree to the IP Assignment"
                desc="I understand and agree that all intellectual property I create during my engagement shall be owned by the Company." />
              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back}>← Back</button>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (!data.agreed_to_ip_assignment) { setError('You must agree to the IP Assignment to continue.'); return; }
                  next();
                }} disabled={!data.agreed_to_ip_assignment}>Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Code of Conduct ──────────────────────────── */}
          {step === 5 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Code of Conduct &amp; Ethics
              </div>
              <div className="nda-section-desc">
                Our Code of Conduct reflects the values and standards we hold as a team.
              </div>
              <div className="nda-divider" />
              <div className="nda-doc-box">
                <p><strong>Professional Conduct:</strong> Treat all colleagues, clients, and partners with respect and professionalism at all times.</p>
                <p><strong>Anti-Harassment (POSH Act, 2013):</strong> Zero tolerance for any form of sexual harassment in the workplace. The Company has an Internal Complaints Committee (ICC) as mandated by law.</p>
                <p><strong>Anti-Bribery &amp; Corruption:</strong> You must not offer, accept, or facilitate any bribe or corrupt payment in connection with Company business.</p>
                <p><strong>Social Media Policy:</strong> Do not disclose confidential information, make derogatory statements about colleagues or clients, or represent personal opinions as the Company's views on social media.</p>
                <p><strong>IT Asset Policy:</strong> Company devices and systems must be used for legitimate business purposes only. Personal use must be minimal and must not compromise security.</p>
                <p><strong>Conflict of Interest:</strong> You must disclose any actual or potential conflict of interest to your manager promptly.</p>
              </div>
              <ConsentCard checked={data.agreed_to_code_of_conduct} onChange={toggle('agreed_to_code_of_conduct')} required
                title="I agree to the Code of Conduct"
                desc="I have read and agree to abide by the Company's Code of Conduct, Anti-Harassment, Anti-Bribery, Social Media, and IT Asset policies." />
              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back}>← Back</button>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (!data.agreed_to_code_of_conduct) { setError('You must agree to the Code of Conduct to continue.'); return; }
                  next();
                }} disabled={!data.agreed_to_code_of_conduct}>Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Leave Policy ─────────────────────────────── */}
          {step === 6 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Holidays, Timings &amp; Leave Policy
              </div>
              <div className="nda-section-desc">
                Acknowledge the Company's working hours, public holidays, and leave entitlements for your role.
              </div>
              <div className="nda-divider" />
              <div className="nda-doc-box">
                <p><strong>Working Hours:</strong> Standard working hours are Monday to Friday, 9:30 AM – 6:30 PM IST. Flexible and remote working arrangements are subject to manager approval.</p>
                <p><strong>Public Holidays:</strong> The Company observes all gazetted public holidays declared under the Karnataka Shops and Commercial Establishments Act. The holiday calendar is published at the start of each year.</p>
                <p><strong>Annual Leave — Employees:</strong> 18 days per calendar year (earned leave), in addition to 12 days casual/sick leave. Leave must be applied for and approved in advance through the HR portal.</p>
                <p><strong>Annual Leave — Interns:</strong> Interns are entitled to the statutory minimum as applicable. All time off must be pre-approved by the reporting manager.</p>
                <p><strong>Unauthorised Absence:</strong> Repeated unapproved absences may result in disciplinary action including loss of pay and/or termination of engagement.</p>
              </div>
              <ConsentCard checked={data.agreed_to_leave_policy} onChange={toggle('agreed_to_leave_policy')} required
                title="I acknowledge the Leave Policy"
                desc="I have read and understood the working hours, public holiday schedule, and leave entitlements applicable to my role." />
              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back}>← Back</button>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (!data.agreed_to_leave_policy) { setError('You must acknowledge the Leave Policy to continue.'); return; }
                  next();
                }} disabled={!data.agreed_to_leave_policy}>Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 7: E-Signature ──────────────────────────────── */}
          {step === 7 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Electronic Signature
              </div>
              <div className="nda-section-desc">
                Draw your signature below. This acts as your digital acknowledgment of all the agreements above.
              </div>
              <div className="nda-divider" />
              <div className="nda-sig-wrapper">
                <SignatureCanvasComponent
                  ref={sigCanvas}
                  penColor="#1e40af"
                  velocityFilterWeight={0.7}
                  canvasProps={{ style: { width: '100%', height: '200px' } }}
                  onBegin={() => setSigIsEmpty(false)}
                />
                {sigIsEmpty && (
                  <div className="nda-sig-placeholder">
                    Draw your signature here
                  </div>
                )}
              </div>
              <div className="nda-sig-actions">
                <button className="nda-btn nda-btn-ghost" onClick={() => {
                  sigCanvas.current?.clear();
                  setSigIsEmpty(true);
                }}>Clear</button>
                <span style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center', marginLeft: 8 }}>
                  Use a stylus or mouse to draw your signature
                </span>
              </div>
              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back}>← Back</button>
                <button className="nda-btn nda-btn-primary" onClick={() => {
                  if (sigIsEmpty || sigCanvas.current?.isEmpty()) {
                    setError('Please draw your signature before proceeding.');
                    return;
                  }
                  let sig = '';
                  try { sig = sigCanvas.current!.getTrimmedCanvas().toDataURL('image/png'); } catch (_) {}
                  if (!sig || sig === 'data:,') {
                    try { sig = sigCanvas.current!.getCanvas().toDataURL('image/png'); } catch (_) {}
                  }
                  if (!sig) { setError('Could not capture signature. Please try again.'); return; }
                  setError('');
                  setData(d => ({ ...d, signature_image: sig }));
                  next();
                }}>Review &amp; Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 8: Review & Submit ──────────────────────────── */}
          {step === 8 && (
            <div className="nda-step-enter">
              <div className="nda-section-title">
                Review &amp; Submit
              </div>
              <div className="nda-section-desc">
                Please review your information before submitting. Once submitted, a signed PDF will be generated and emailed to you and HR.
              </div>
              <div className="nda-divider" />

              <div className="nda-review-grid">
                <div className="nda-review-card">
                  <div className="nda-review-card-title">Joinee Details</div>
                  {[
                    ['Name', data.full_name],
                    ['Role', data.role],
                    ['Department', data.department],
                    ['Designation', data.designation],
                    ['ID', data.employee_intern_id || '(Auto-generated)'],
                    ['Joining', data.date_of_joining],
                    ['Email', data.personal_email],
                    ['Phone', data.phone],
                  ].map(([l, v]) => (
                    <div className="nda-review-row" key={l}>
                      <span className="nda-review-label">{l}</span>
                      <span className="nda-review-value">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="nda-review-card">
                  <div className="nda-review-card-title">Agreement Status</div>
                  <div className="nda-consent-check-list">
                    {[
                      ['NDA',                data.agreed_to_nda],
                      ['Data Processing',   data.consent_data_processing],
                      ['Background Check',  data.consent_background_verification],
                      ['Communication',     data.consent_communication],
                      ['Device Monitoring', data.consent_device_monitoring],
                      ['IP Assignment',     data.agreed_to_ip_assignment],
                      ['Code of Conduct',   data.agreed_to_code_of_conduct],
                      ['Leave Policy',      data.agreed_to_leave_policy],
                      ['Photo/Video',       data.consent_photo_video],
                    ].map(([l, v]) => (
                      <div className="nda-consent-check-row" key={String(l)}>
                        <span className={v ? 'tick-yes' : 'tick-no'}>{v ? '✓' : '○'}</span>
                        <span>{String(l)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {data.signature_image && (
                <div className="nda-review-card" style={{ marginBottom: 20 }}>
                  <div className="nda-review-card-title">Your Signature</div>
                  <div className="nda-sig-preview">
                    <img src={data.signature_image} alt="Your signature" />
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    By submitting, you confirm this is your authentic digital signature.
                  </div>
                </div>
              )}

              {loading && (
                <div className="nda-loading-overlay">
                  <div className="nda-loading-bar"><div className="nda-loading-bar-fill" /></div>
                  <div className="nda-loading-hint">{loadingMsg || 'Processing...'} — Please do not close this page.</div>
                </div>
              )}

              <div className="nda-btn-row">
                <button className="nda-btn nda-btn-secondary" onClick={back} disabled={loading}>← Back</button>
                <button className="nda-btn nda-btn-success" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <><span className="nda-loading-spinner" />{loadingMsg || 'Processing...'}</>
                  ) : 'Submit & Generate PDF'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
