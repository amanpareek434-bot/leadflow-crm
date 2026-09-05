export const metadata = { title: "Data Deletion — LeadFlow CRM" };

export default function DataDeletionPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Data Deletion Instructions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <p>
          This page explains how to have your data removed from LeadFlow CRM, depending on who you are. It applies to
          data connected through Meta (Facebook/WhatsApp), Google, and Shopify integrations, as well as data entered
          directly into the product.
        </p>

        <section className="rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold">If you're a LeadFlow customer (you have an account)</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <b>Disconnect an integration only:</b> go to <span className="font-mono text-xs">Integrations</span> in your
              dashboard and click <b>Disconnect</b> on Meta Ads, Google Ads, Shopify, Google Sheets, or WhatsApp. This
              immediately deletes the stored access token for that connection and stops any further syncing. Data already
              synced into your CRM (leads, past messages) is not removed by this step alone.
            </li>
            <li>
              <b>Delete your entire account and data:</b> email{" "}
              <a className="underline" href="mailto:akhileshvyas@e-marketingtech.in?subject=Account%20deletion%20request">
                akhileshvyas@e-marketingtech.in
              </a>{" "}
              from your account's registered email address with the subject "Account deletion request". We will
              permanently delete your organization's leads, contacts, deals, messages, integration credentials, and
              account records within 30 days, and confirm by email once complete.
            </li>
          </ol>
        </section>

        <section className="rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold">If you're someone's lead or contact (you don't have a LeadFlow account)</h2>
          <p className="mt-3">
            LeadFlow is CRM software used by businesses to manage their own leads and customers — if your name, phone
            number, or email appears in a LeadFlow account, it's because a business you interacted with (e.g. through
            their ads, WhatsApp, or Shopify store) added or synced it there. We don't have a direct relationship with
            you and can't identify or act on your record without going through that business.
          </p>
          <p className="mt-2">
            To have your information removed, please contact <b>the business you interacted with directly</b> — they
            control their own LeadFlow account and can delete your record from it, which removes it from our systems
            too.
          </p>
        </section>

        <section className="rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold">If you disconnected LeadFlow from your Meta or Google account</h2>
          <p className="mt-3">
            Removing LeadFlow's access from your Facebook/Meta Business settings or Google Account permissions revokes
            our ability to fetch further data immediately. To also delete data already stored in a LeadFlow account, use
            one of the options above (contact the LeadFlow customer, or if it's your own account, email us as described).
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Questions about this page: <a className="underline" href="mailto:akhileshvyas@e-marketingtech.in">akhileshvyas@e-marketingtech.in</a>
        </p>
      </div>
    </div>
  );
}
