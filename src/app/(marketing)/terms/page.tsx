export const metadata = { title: "Terms of Service — LeadFlow CRM" };

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
        <p>These Terms of Service ("Terms") govern your use of LeadFlow CRM (the "Service"). By creating an account, you agree to them.</p>

        <section>
          <h2 className="text-lg font-semibold">1. The Service</h2>
          <p className="mt-2">
            LeadFlow is a customer relationship management platform that lets you manage leads and contacts, connect
            third-party platforms (Meta Ads, Google Ads, Shopify, Google Sheets, WhatsApp Business), automate WhatsApp
            messaging, and view reports. Each customer's data is kept isolated from every other customer's.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Accounts</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must provide accurate information when registering and keep your login credentials confidential.</li>
            <li>You're responsible for activity under your account, including team members you invite.</li>
            <li>The person who registers an organization is its initial Owner and can invite additional team members subject to plan limits.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Your data</h2>
          <p className="mt-2">
            You own the leads, contacts, and other business data you put into the Service. We only process it to provide
            the Service to you (see our <a href="/privacy" className="underline">Privacy Policy</a>). You're responsible
            for having the right to store and process any personal data of third parties (e.g. your own leads/customers)
            that you add to LeadFlow, and for complying with applicable data protection law in how you use it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Connected third-party platforms</h2>
          <p className="mt-2">
            Connecting Meta, Google, Shopify, or WhatsApp is optional and requires your own account/credentials on those
            platforms. Your use of those platforms remains subject to their own terms (Meta Platform Terms, Google APIs
            Terms of Service, Shopify Partner/API terms). We are not responsible for outages, policy changes, or account
            actions taken by those platforms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Subscriptions &amp; billing</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Paid plans are billed on a recurring basis through Razorpay. Prices are shown on the <a href="/pricing" className="underline">Pricing</a> page.</li>
            <li>You can cancel a subscription at any time; access continues until the end of the current billing period.</li>
            <li>Fees already paid are non-refundable except where required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Acceptable use</h2>
          <p className="mt-2">You agree not to use the Service to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Send unsolicited or spam messages via WhatsApp or otherwise, or violate WhatsApp's Business Messaging Policy.</li>
            <li>Access or attempt to access another organization's data.</li>
            <li>Reverse-engineer, resell, or use the Service to build a directly competing product without authorization.</li>
            <li>Upload unlawful content or use the Service in violation of applicable law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Termination</h2>
          <p className="mt-2">
            You may stop using the Service and delete your account at any time (see <a href="/data-deletion" className="underline">Data Deletion</a>).
            We may suspend or terminate accounts that violate these Terms, with notice where reasonably possible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Disclaimer &amp; limitation of liability</h2>
          <p className="mt-2">
            The Service is provided "as is". We do not guarantee uninterrupted operation of third-party integrations we
            don't control (Meta, Google, Shopify, WhatsApp, Razorpay). To the maximum extent permitted by law, we are not
            liable for indirect, incidental, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Changes to these Terms</h2>
          <p className="mt-2">We may update these Terms from time to time; continued use of the Service after an update constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Contact</h2>
          <p className="mt-2">
            Questions about these Terms: <a className="underline" href="mailto:akhileshvyas@e-marketingtech.in">akhileshvyas@e-marketingtech.in</a>
          </p>
        </section>

        <p className="mt-8 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          This page is a working draft covering what Meta and Google's app-review process typically expects to see. Have
          it reviewed by a lawyer before relying on it as your final, binding terms — especially around billing,
          liability, and data protection obligations specific to your jurisdiction.
        </p>
      </div>
    </div>
  );
}
