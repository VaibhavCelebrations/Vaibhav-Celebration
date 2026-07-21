export default function TermsPage() {
  return (
    <div className="prose prose-sm md:prose-base prose-stone max-w-none">
      <h2 className="font-display text-2xl text-charcoal">1. Introduction</h2>
      <p>
        Welcome to Vaibhav Celebrations. By booking our services, you agree to these Terms and Conditions. Please read them carefully.
      </p>

      <h2 className="font-display text-2xl text-charcoal">2. Booking and Payments</h2>
      <ul>
        <li>A 50% non-refundable advance payment is required to confirm your booking date.</li>
        <li>The remaining 50% must be paid on the day of the event, prior to the start of the celebration.</li>
        <li>Payments can be made via UPI, Credit/Debit cards, or Net Banking.</li>
      </ul>

      <h2 className="font-display text-2xl text-charcoal">3. Service Execution</h2>
      <ul>
        <li>We require access to the venue at least 3-4 hours prior to the event start time for decoration setup.</li>
        <li>The client is responsible for ensuring the venue allows our decorations and equipment.</li>
      </ul>

      <h2 className="font-display text-2xl text-charcoal">4. Damages</h2>
      <p>
        Any damage to our rented props, backdrops, or equipment during the event (caused by guests or venue staff) will be billed to the client at replacement cost.
      </p>

      <p className="mt-8 text-sm text-text-light">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
