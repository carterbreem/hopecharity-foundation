import { useState, useRef, useEffect } from 'react';
import {
  HandHeart,
  Stethoscope,
  GraduationCap,
  Home as HomeIcon,
  Zap,
  Wallet,
  Heart,
  FileText,
  CheckCircle2,
  ArrowRight,
  User,
  DollarSign,
  ClipboardList,
  ChevronDown,
  Search,
  Check,
  Calendar,
} from 'lucide-react';
import { useNavigate } from '../router';
import { useAuth } from '../context/AuthContext';
import {
  supabase,
  type AssistanceType,
  ASSISTANCE_CATEGORIES,
  COUNTRIES,
} from '../lib/supabase';
import { PageHeader, ErrorBanner, Spinner } from '../components/ui';

const categoryIcons: Record<AssistanceType, typeof Stethoscope> = {
  medical_bills: Stethoscope,
  education: GraduationCap,
  housing: HomeIcon,
  emergency_relief: Zap,
  financial_hardship: Wallet,
  other_community: Heart,
};

function generateReference(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join('');
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `HCF-${letters}-${digits}`;
}

/**
 * Convert a typed string like "15/01/1990" or "15011990" into "DD/MM/YYYY".
 * Returns the cleaned string with slashes as the user types.
 */
function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Validate a DD/MM/YYYY string. Returns a Date object or null if invalid.
 */
function parseDob(input: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isAtLeast18(dateStr: string): boolean {
  const dob = parseDob(dateStr);
  if (!dob) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field flex items-center justify-between"
      >
        <span className={value ? 'text-neutral-900' : 'text-neutral-400'}>
          {value || 'Select your country...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary-400"
                placeholder="Search countries..."
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-neutral-400">No countries found</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-primary-50 ${
                    value === c ? 'bg-primary-50 font-medium text-primary-700' : 'text-neutral-700'
                  }`}
                >
                  {c}
                  {value === c && <Check className="h-4 w-4 text-primary-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Apply() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const [form, setForm] = useState({
    applicant_name: profile?.full_name ?? '',
    email: user?.email ?? '',
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    region: '',
    postal_code: '',
    country: '',
    assistance_type: '' as AssistanceType | '',
    amount_requested: '',
    description: '',
    why_needed: '',
    how_helps: '',
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const resetForm = () => ({
    applicant_name: profile?.full_name ?? '',
    email: user?.email ?? '',
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    region: '',
    postal_code: '',
    country: '',
    assistance_type: '' as AssistanceType | '',
    amount_requested: '',
    description: '',
    why_needed: '',
    how_helps: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.assistance_type) {
      setError('Please select an assistance category.');
      return;
    }
    if (!form.country) {
      setError('Please select your country.');
      return;
    }
    if (!form.date_of_birth) {
      setError('Please provide your date of birth in DD/MM/YYYY format.');
      return;
    }
    if (!parseDob(form.date_of_birth)) {
      setError('Please enter a valid date of birth in DD/MM/YYYY format.');
      return;
    }
    if (!isAtLeast18(form.date_of_birth)) {
      setError('You must be at least 18 years old to apply.');
      return;
    }
    const amount = parseFloat(form.amount_requested);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid requested amount.');
      return;
    }
    if (form.description.trim().length < 20) {
      setError('Please provide a description of your situation (at least 20 characters).');
      return;
    }
    if (form.why_needed.trim().length < 10) {
      setError('Please explain why you need assistance (at least 10 characters).');
      return;
    }
    if (form.how_helps.trim().length < 10) {
      setError('Please explain how the assistance will help (at least 10 characters).');
      return;
    }

    setSubmitting(true);

    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let lastError: string | null = null;
    let insertedData: { id: string; reference_number: string | null } | null = null;

    while (attempt < MAX_ATTEMPTS && !insertedData) {
      attempt++;
      const reference_number = generateReference();

      try {
        const { data, error: insertError } = await supabase
          .from('applications')
          .insert({
            applicant_name: form.applicant_name,
            email: form.email,
            phone: form.phone || null,
            date_of_birth: form.date_of_birth || null,
            address: form.address || null,
            city: form.city || null,
            region: form.region || null,
            postal_code: form.postal_code || null,
            country: form.country || null,
            assistance_type: form.assistance_type,
            amount_requested: amount,
            description: form.description,
            why_needed: form.why_needed,
            how_helps: form.how_helps,
            reference_number,
          })
          .select('id, reference_number')
          .single();

        if (insertError) {
          lastError = insertError.message;
          // eslint-disable-next-line no-console
          console.error('[Apply] insert attempt failed', { attempt, error: insertError.message });
          if (!/duplicate|unique/i.test(insertError.message)) {
            break;
          }
        } else if (data) {
          insertedData = data;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Apply] unexpected error', err);
        lastError = err instanceof Error ? err.message : String(err);
        break;
      }
    }

    setSubmitting(false);

    if (!insertedData) {
      // eslint-disable-next-line no-console
      console.error('[Apply] submission failed', lastError);
      setError('We were unable to submit your application at this time. Please try again later.');
      return;
    }

    setSubmittedRef(insertedData.reference_number ?? insertedData.id);
    setSuccess(true);
  };

  if (!user) {
    return (
      <div>
        <PageHeader
          title="Apply for Assistance"
          subtitle="We are here to help. Please sign in or create an account to submit your application."
        />
        <section className="section-padding bg-white">
          <div className="container-max max-w-2xl">
            <div className="card p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
                <HandHeart className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-neutral-900">
                Account Required
              </h2>
              <p className="mt-3 text-sm text-neutral-600">
                To protect your privacy and allow you to track your application
                status, you need an account to apply for assistance. It only
                takes a minute to create one.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={() => navigate('auth')} className="btn-primary">
                  Sign In or Sign Up
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('home')} className="btn-ghost">
                  Back to Home
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: FileText, title: '1. Create Account', desc: 'Sign up with your email' },
                { icon: HandHeart, title: '2. Fill Application', desc: 'Tell us about your needs' },
                { icon: CheckCircle2, title: '3. Track Status', desc: 'Monitor your application' },
              ].map((step) => (
                <div key={step.title} className="card p-5 text-center">
                  <step.icon className="mx-auto h-8 w-8 text-primary-600" />
                  <h3 className="mt-3 text-sm font-bold text-neutral-900">{step.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-900/50 p-4 backdrop.
-blur-sm">
        <div className           ="relative my-8 w-full max-w </-lg rounded-2xl bg-white shadow-p>
2xl">
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
              <CheckCircle2 className="h-9 w-9 text-success-600" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-neutral-900">
              Application Received Successfully
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Thank you for reaching out to Hope Charity Foundation            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Your application has been successfully received and is now awaiting review by our team.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Please save your application reference number. You will need it to track your application.
            </p>
            {submittedRef && (
              <div className="mt-5 rounded-lg bg-primary-50 p-5">
                <p className="text-xs uppercase tracking-wider text-primary-600">
                  Your Application Reference Number
                </p>
                <p className="mt-2 font-mono text-xl font-bold text-primary-800">
                  {submittedRef}
                </p>
              </div>
            )}
            <div className="mt-5 rounded-lg border-2 border-accent-300 bg-accent-50 p-4 text-left">
              <p className="text-sm font-bold text-accent-800">
                IMPORTANT:
              </p>
              <p className="mt-1 text-sm font-semibold text-accent-800">
                Contact our support team at hopecharityfoundation24@gmail.com. Please provide your application reference number in your correspondence to enable our team to promptly locate your application and provide the necessary assistance regarding its processing.
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">
              Our team will contact you with the next steps.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={() => navigate('tracker')} className="btn-primary">
                Track My Application
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setSubmittedRef(null);
                  setForm(resetForm());
                }}
                className="btn-outline"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Apply for Assistance"
        subtitle="Please complete the form below. All information is kept strictly confidential and used only for evaluating your request. Applicants from any country are welcome to apply."
      />

      <section className="section-padding bg-white">
        <div className="container-max max-w-3xl">
          <form onSubmit={handleSubmit} className="card p-8">
            {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

            {/* Section: Applicant Information */}
            <div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-bold text-neutral-900">Applicant Information</h3>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.applicant_name}
                    onChange={(e) => update('applicant_name', e.target.value)}
                    className="input-field"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="input-field"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className="input-field"
                    placeholder="+44 20 1234 5678"
                  />
                  <p className="mt-1 text-xs text-neutral-400">Include country code (e.g. +44, +1, +91)</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      value={form.date_of_birth}
                      onChange={(e) =>
                        update('date_of_birth', formatDobInput(e.target.value))
                      }
                      className="input-field pl-10"
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">Format: DD/MM/YYYY — you must be 18 or older</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Country *
                  </label>
                  <CountrySelect
                    value={form.country}
                    onChange={(v) => update('country', v)}
                  />
                </div>
              </div>

              {/* International Address Fields */}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    className="input-field"
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className="input-field"
                    placeholder="London"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    State / Province / Region
                  </label>
                  <input
                    type="text"
                    value={form.region}
                    onChange={(e) => update('region', e.target.value)}
                    className="input-field"
                    placeholder="Greater London"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => update('postal_code', e.target.value)}
                    className="input-field"
                    placeholder="SW1A 1AA"
                  />
                </div>
              </div>
            </div>

            <div className="my-8 border-t border-neutral-100" />

            {/* Section: Assistance Details */}
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary-600" />
                <h3 className="text-base font-bold text-neutral-900">Assistance Details</h3>
              </div>

              <div className="mt-5">
                <label className="mb-3 block text-sm font-medium text-neutral-700">
                  Assistance Category *
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ASSISTANCE_CATEGORIES.map((cat) => {
                    const Icon = categoryIcons[cat.value];
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => update('assistance_type', cat.value)}
                        className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                          form.assistance_type === cat.value
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-neutral-200 hover:border-primary-300'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${form.assistance_type === cat.value ? 'text-primary-600' : 'text-neutral-400'}`} />
                        <span className={`text-sm font-semibold ${form.assistance_type === cat.value ? 'text-primary-800' : 'text-neutral-800'}`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {form.assistance_type && (
                  <p className="mt-2 text-xs text-neutral-500">
                    {ASSISTANCE_CATEGORIES.find((c) => c.value === form.assistance_type)?.description}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Amount of Assistance Requested ($) *
                </label>
                <div className="relative max-w-xs">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={form.amount_requested}
                    onChange={(e) => update('amount_requested', e.target.value)}
                    className="input-field pl-10"
                    placeholder="500.00"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Description of Your Situation *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="input-field resize-none"
                  placeholder="Please describe your current situation..."
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  Provide as much detail as possible to help us understand your current circumstances.
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Why Assistance Is Needed *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.why_needed}
                  onChange={(e) => update('why_needed', e.target.value)}
                  className="input-field resize-none"
                  placeholder="Explain why you are seeking assistance at this time..."
                />
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  How the Assistance Will Help *
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.how_helps}
                  onChange={(e) => update('how_helps', e.target.value)}
                  className="input-field resize-none"
                  placeholder="Describe how this assistance will make a difference for you and your family..."
                />
              </div>
            </div>

            <div className="my-8 border-t border-neutral-100" />

            {/* Consent */}
            <div className="flex items-start gap-4 rounded-xl bg-primary-50 p-4">
              <input type="checkbox" required id="consent" className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
              <label htmlFor="consent" className="text-sm text-neutral-700">
                I confirm that the information provided is accurate and complete to the best of my knowledge. I understand that my information will be kept confidential and used only for evaluating my request.
              </label>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <HandHeart className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </button>
              <button type="button" onClick={() => navigate('home')} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
