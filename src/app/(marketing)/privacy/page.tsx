import Link from "next/link";

export const metadata = { title: "Privacy Policy — LeadFlow CRM" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
        <p>
          LeadFlow CRM ("LeadFlow", "we", "us") provides a customer relationship management platform. This policy
          explains what information we collect when you or your organization ("you", "your business") use the
          product, why we collect it, and how you can control it.
        </p>

        <section>
          <h2 className="text-lg font-semibold">1. Information we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>Account information:</b> name, email address, and password (stored as a salted hash, never in plain text) when you register.</li>
            <li><b>Customer data you add:</b> leads, contacts, deals, notes, and activity you or your team create inside the CRM.</li>
            <li>
              <b>Connected platform data:</b> if you connect Meta Ads, Google Ads, Shopify, Google Sheets, or WhatsApp, we store the access
              tokens needed to sync data (encrypted at rest) and the data those platforms return — e.g. lead-form submissions, ad campaign
              performance (spend, clicks, impressions), Shopify customers/orders, or WhatsApp message content and delivery status.
            </li>
            <li><b>Billing information:</b> subscription plan and payment status. Card/payment details themselves are handled directly by our payment processor, Razorpay — we never see or store your card number.</li>
            <li><b>Usage data:</b> login timestamps and basic product usage needed for security and support.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. How we use it</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To operate the CRM: store your leads, run the automations you configure (like sending a WhatsApp template when a lead's status changes), and generate your reports.</li>
            <li>To sync data with platforms you explicitly connect (Meta, Google, Shopify, WhatsApp) — only for your own organization, using your own connected accounts.</li>
            <li>To process subscription payments via Razorpay and manage your plan.</li>
            <li>To respond to support requests and send essential account/service notifications.</li>
          </ul>
          <p className="mt-2">We do not sell your data, or the data of your leads and contacts, to anyone.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Data isolation between customers</h2>
          <p className="mt-2">
            LeadFlow is multi-tenant software: every organization's leads, contacts, messages, and connected-platform data are stored
            separately and are never visible to another organization using the same deployment.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Third-party services we use</h2>
          <p className="mt-2">Depending on which integrations you turn on, data may be shared with:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>Meta Platforms, Inc.</b> — WhatsApp Business Platform and Meta Marketing API, if you connect them.</li>
            <li><b>Google LLC</b> — Google Ads API and Google Sheets API, if you connect them.</li>
            <li><b>Shopify Inc.</b> — Shopify Admin API, if you connect a store.</li>
            <li><b>Razorpay Software Private Limited</b> — subscription billing and payment processing.</li>
          </ul>
          <p className="mt-2">Each of these processes data under their own privacy policy in addition to this one.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Data retention &amp; deletion</h2>
          <p className="mt-2">
            We retain your data for as long as your account is active. You can disconnect any integration at any time from
            Integrations in your dashboard, which stops further syncing and removes the stored access token immediately. For
            full account and data deletion instructions, see our <Link href="/data-deletion" className="underline">Data Deletion page</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Security</h2>
          <p className="mt-2">
            Passwords are hashed, not stored in plain text. Integration access tokens (Meta, Google, Shopify, WhatsApp) are
            encrypted at rest. Access to your organization's data requires authentication and is scoped strictly to your own
            account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Your rights</h2>
          <p className="mt-2">
            You can access, correct, export, or delete your data at any time from within the product, or by contacting us
            using the details below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Contact us</h2>
          <p className="mt-2">
            Questions about this policy or your data: <a className="underline" href="mailto:akhileshvyas@e-marketingtech.in">akhileshvyas@e-marketingtech.in</a>
          </p>
        </section>

        <p className="mt-8 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          This page is a working draft covering what Meta and Google's app-review process typically expects to see. Have it
          reviewed by a lawyer before relying on it as your final, binding policy — especially once you're processing real
          customer payment and personal data at scale.
        </p>
      </div>
    </div>
  );
}
