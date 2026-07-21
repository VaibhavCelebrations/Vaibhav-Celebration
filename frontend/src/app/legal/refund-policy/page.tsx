export default function RefundPage() {
  return (
    <div className="prose prose-sm md:prose-base prose-stone max-w-none">
      <h2 className="font-display text-2xl text-charcoal">1. Advance Payment</h2>
      <p>
        A 50% non-refundable advance payment is required to confirm your booking date and secure our services.
      </p>

      <h2 className="font-display text-2xl text-charcoal">2. Cancellations by Client</h2>
      <ul>
        <li><strong>More than 14 days before the event:</strong> The advance payment cannot be refunded, but it can be adjusted towards a future booking within 6 months.</li>
        <li><strong>Less than 14 days before the event:</strong> The advance payment is strictly non-refundable and non-transferable, as customized preparations and bookings have already commenced.</li>
      </ul>

      <h2 className="font-display text-2xl text-charcoal">3. Postponement</h2>
      <p>
        If you need to postpone the event due to unforeseen circumstances, please inform us at least 7 days prior. We will do our best to accommodate the new date, subject to our availability.
      </p>

      <h2 className="font-display text-2xl text-charcoal">4. Cancellations by Vaibhav Celebrations</h2>
      <p>
        In the highly unlikely event that we have to cancel your booking due to unavoidable circumstances (such as extreme weather or medical emergencies), a full 100% refund of any amount paid will be issued immediately.
      </p>

      <p className="mt-8 text-sm text-text-light">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
