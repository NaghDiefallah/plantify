const sections = [
  {
    heading: "Service Scope",
    body: "Plantify provides AI-assisted crop diagnostics and recommendations. Outputs are decision-support guidance and do not replace professional agronomic judgment."
  },
  {
    heading: "Account Responsibilities",
    body: "You are responsible for account credentials, lawful usage, and accuracy of submitted data. Unauthorized access attempts are prohibited."
  },
  {
    heading: "Acceptable Use",
    body: "You agree not to abuse API capacity, bypass security controls, or use the service for unlawful or harmful activity."
  },
  {
    heading: "Service Availability",
    body: "We may update, suspend, or modify parts of the service for maintenance, security, or operational needs."
  },
  {
    heading: "Intellectual Property",
    body: "Platform code, branding, and service content remain property of Plantify and its licensors unless otherwise stated."
  },
  {
    heading: "Liability",
    body: "Plantify is provided as-is to the fullest extent allowed by law. Operational continuity and model output can vary by input quality and environmental factors."
  }
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Terms of Service</h1>
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
