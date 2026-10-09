import React, { useEffect } from "react";
import { Shield, Lock, FileText, Database } from "lucide-react";

interface LegalPageProps {
  onNavigate?: (page: string) => void;
  section?: string;
}

const SECTIONS = [
  { id: "privacy", icon: Lock, label: "Privacy Policy" },
  { id: "terms", icon: FileText, label: "Terms of Use" },
  { id: "security", icon: Shield, label: "Security Disclosure" },
  { id: "data-protection", icon: Database, label: "Data Protection" },
];

export const LegalPage: React.FC<LegalPageProps> = ({ section }) => {
  useEffect(() => {
    if (section) {
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [section]);

  return (
    <div className="min-h-screen bg-[#f9f7fd]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-12">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600 mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-black text-[#171222]">Legal &amp; Compliance</h1>
          <div className="w-14 h-1 rounded-full bg-gradient-to-r from-orange-500 to-indigo-500 mt-4" />
          <p className="text-slate-500 text-sm mt-4 leading-relaxed max-w-xl">
            IndoFleet Technologies operates enterprise UAV flight corridors, hardware QC, and aerospace fleet operations under DGCA Drone Rules 2021.
            These documents govern your use of our platform, data practices, and security standards.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {SECTIONS.map(s => (
              <a key={s.id} href={"#" + s.id}
                onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors">
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* PRIVACY POLICY */}
        <section id="privacy" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center"><Lock className="w-5 h-5" /></div>
            <div>
              <h2 className="text-2xl font-black text-[#171222]">Privacy Policy</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: September 2026</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 space-y-6 text-sm text-slate-600 leading-relaxed">
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">1. Information We Collect</h3>
              <p>IndoFleet collects information necessary to provide autonomous drone delivery services, including:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Account data:</strong> Name, email address, phone number (for OTP verification)</li>
                <li><strong>Delivery data:</strong> Pickup address, drop-off address, package type and weight</li>
                <li><strong>Billing data:</strong> Account billing preference and corporate invoicing records.</li>
                <li><strong>Location data:</strong> Delivery coordinates used exclusively for UAV flight path calculation</li>
                <li><strong>Usage data:</strong> App interactions, support requests, and feedback submissions</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">2. How We Use Your Data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>To dispatch and track autonomous drone deliveries to your address</li>
                <li>To send SMS/email delivery status updates and OTP verification</li>
                <li>To manage corporate order invoicing and dispatch tracking</li>
                <li>To improve UAV flight corridor optimisation and delivery accuracy</li>
                <li>To comply with DGCA Drone Rules 2021 flight log requirements</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">3. Data Sharing</h3>
              <p>We do <strong>not</strong> sell your personal data. We share data only with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Firebase & Resend:</strong> SMS/Email notifications and OTP delivery</li>
                <li><strong>Supabase:</strong> Secure cloud database storage</li>
                <li><strong>DGCA:</strong> Flight logs as mandated by Indian aviation law</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">4. Data Retention</h3>
              <p>Order data is retained for 5 years for DGCA compliance. Account data is retained until deletion request. Email <a href="mailto:support@indowfleet.com" className="text-purple-600 hover:underline">support@indowfleet.com</a> for any privacy requests.</p>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">5. Your Rights</h3>
              <p>Under India Digital Personal Data Protection Act (DPDPA) 2023, you have the right to access, correct, and erase your personal data. Contact <a href="mailto:support@indowfleet.com" className="text-purple-600 hover:underline">support@indowfleet.com</a>.</p>
            </div>
          </div>
        </section>

        {/* TERMS OF USE */}
        <section id="terms" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
            <div>
              <h2 className="text-2xl font-black text-[#171222]">Terms of Use</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: September 2026</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 space-y-6 text-sm text-slate-600 leading-relaxed">
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">1. Acceptance of Terms</h3>
              <p>By using IndoFleet delivery services, you agree to these Terms of Use. These terms are governed by the laws of India.</p>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">2. Eligible Use</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You must be 18 years or older to place orders</li>
                <li>Delivery addresses must be within our approved Delhi-NCR air corridors</li>
                <li>One account per individual. Shared accounts are not permitted.</li>
                <li>You are responsible for providing accurate pickup and drop-off addresses</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">3. Prohibited Items</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Narcotics, controlled substances, or illegal goods</li>
                <li>Flammable, explosive, or hazardous materials</li>
                <li>Live animals or perishables requiring cold chain beyond 2 hours</li>
                <li>Items weighing more than 5 kg</li>
                <li>Any item prohibited under Indian customs or aviation law</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">4. Liability</h3>
              <p>IndoFleet maximum liability per delivery is limited to the declared value of the package or Rs. 5,000, whichever is lower. We are not liable for delays caused by weather, DGCA airspace restrictions, or events beyond operational control.</p>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">5. Cancellations &amp; Refunds</h3>
              <p>Orders can be cancelled before UAV dispatch for a full refund. Once the drone is in flight, cancellation is not possible. Refunds for failed deliveries are processed within 5-7 business days.</p>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">6. Service Availability</h3>
              <p>Services operate in DGCA-approved air corridors only. IndoFleet reserves the right to suspend service in any zone without notice if required by regulatory authorities or safety concerns.</p>
            </div>
          </div>
        </section>

        {/* SECURITY DISCLOSURE */}
        <section id="security" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Shield className="w-5 h-5" /></div>
            <div>
              <h2 className="text-2xl font-black text-[#171222]">Security Disclosure</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: September 2026</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 space-y-6 text-sm text-slate-600 leading-relaxed">
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">1. Platform Security</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>All API communications use HTTPS/TLS 1.3 encryption</li>
                <li>User authentication uses JWT tokens</li>
                <li>OTP-based phone verification for all account logins</li>
                <li>Passwords are never stored — authentication is OTP-only</li>
                <li>Enterprise orders follow pre-authorized corporate dispatch protocols</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">2. UAV Security</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>All drones operate on encrypted telemetry channels</li>
                <li>C2 links comply with DGCA BVLOS operational requirements</li>
                <li>Autonomous fail-safe protocols activated on signal loss or weather breach</li>
                <li>Flight logs are cryptographically signed and tamper-evident</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">3. Responsible Disclosure</h3>
              <p>If you discover a security vulnerability, please report it to:</p>
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-[#171222]">security@indowfleet.com</p>
                <p className="text-xs text-slate-400 mt-1">We respond to all valid security reports within 72 hours and do not pursue legal action against good-faith security researchers.</p>
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">4. Incident Response</h3>
              <p>In the event of a data breach, IndoFleet will notify affected users within 72 hours as required by DPDPA 2023, and report to CERT-In within the legally mandated timeframe.</p>
            </div>
          </div>
        </section>

        {/* DATA PROTECTION */}
        <section id="data-protection" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><Database className="w-5 h-5" /></div>
            <div>
              <h2 className="text-2xl font-black text-[#171222]">Data Protection</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: September 2026</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-7 sm:p-10 space-y-6 text-sm text-slate-600 leading-relaxed">
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">1. Compliance Framework</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>India Digital Personal Data Protection Act (DPDPA) 2023</li>
                <li>IT Act 2000 and IT (Amendment) Act 2008</li>
                <li>DGCA Drone Rules 2021 — flight log retention mandates</li>
                <li>RBI guidelines for payment data handling</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">2. Data Storage</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>All user data stored on Supabase (PostgreSQL) in Asia-Pacific region</li>
                <li>Database access restricted to authenticated backend services only</li>
                <li>Row-level security policies prevent cross-user data access</li>
                <li>Automated backups every 24 hours with 30-day retention</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">3. Data Minimisation</h3>
              <p>We collect only the minimum data required to complete your delivery. Location data is used exclusively for UAV flight path generation and is not shared with third parties for advertising or profiling.</p>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">4. Your Rights Under DPDPA 2023</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Right to access:</strong> Request a copy of all personal data we hold about you</li>
                <li><strong>Right to correction:</strong> Update inaccurate personal information</li>
                <li><strong>Right to erasure:</strong> Request deletion of your account and data</li>
                <li><strong>Right to grievance:</strong> Lodge a complaint with our Data Protection Officer</li>
                <li><strong>Right to nominate:</strong> Nominate a person to exercise rights on your behalf</li>
              </ul>
            </div>
            <div>
              <h3 className="text-base font-black text-[#171222] mb-2">5. Contact</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-[#171222]">IndoFleet Technologies — Data Protection Officer</p>
                <a href="mailto:support@indowfleet.com" className="text-purple-600 hover:underline">support@indowfleet.com</a>
                <p className="text-xs text-slate-400 mt-2">We respond to all data protection requests within 30 days as required by law.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
