export default function PrivacyPage() {
  return (
    <div className="prose prose-sm md:prose-base prose-stone max-w-none">
      <h2 className="font-display text-2xl text-charcoal">1. Information We Collect</h2>
      <p>
        We collect personal information that you provide to us when booking a consultation or celebration. This may include your name, email address, phone number, child's name, and age.
      </p>

      <h2 className="font-display text-2xl text-charcoal">2. How We Use Your Information</h2>
      <p>
        We use the information we collect to:
      </p>
      <ul>
        <li>Provide, operate, and maintain our services</li>
        <li>Communicate with you regarding your booking</li>
        <li>Send you marketing emails (if you have opted in)</li>
      </ul>

      <h2 className="font-display text-2xl text-charcoal">3. Sharing Your Information</h2>
      <p>
        We do not sell your personal information. We may share your information with trusted third-party vendors (such as bakers or entertainers) only when necessary to fulfill your celebration package.
      </p>

      <h2 className="font-display text-2xl text-charcoal">4. Photography and Social Media</h2>
      <p>
        With your prior consent, we may take photos of the celebration setup and share them on our social media channels or website portfolio. We always prioritize the privacy of your children and guests.
      </p>

      <p className="mt-8 text-sm text-text-light">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
