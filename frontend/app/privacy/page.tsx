const sections = [
  {
    heading: "Data We Collect",
    body: "We collect account profile data, authentication events, and scan metadata required to deliver diagnostics and maintain platform security."
  },
  {
    heading: "How We Use Data",
    body: "Data is used to authenticate users, provide disease analysis, improve model performance, and monitor reliability and abuse prevention controls."
  },
  {
    heading: "Data Sharing",
    body: "We do not sell personal data. Data may be shared with infrastructure providers solely for hosting, security, and service delivery under contractual safeguards."
  },
  {
    heading: "Security Controls",
    body: "Plantify applies technical and organizational controls including access restriction, request tracing, and abuse protection to reduce unauthorized access risk."
  },
  {
    heading: "Retention",
    body: "Account and scan records are retained while your account is active or as required for operational, legal, and security obligations."
  },
  {
    heading: "Your Rights",
    body: "You may request access, correction, portability, or deletion of your personal data, subject to legal and security requirements."
  }
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">Last updated: March 28, 2026</p>
      <div className="mt-8 space-y-6">
        {sections.map((section) => (
          <section key={section.heading} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{section.heading}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
