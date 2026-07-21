import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const servicesDetails: Record<string, { title: string; description: string }> = {
  "customized-celebrations": {
    title: "Customized Celebrations",
    description: "We believe every child is unique, and their birthday should be too! Our customized celebrations are tailored to your child's personality, interests, and dreams. From venue selection to bespoke decor, we handle every detail so you can enjoy a stress-free and magical day."
  },
  "themed-experiences": {
    title: "Themed Experiences",
    description: "Transform your venue into a magical wonderland. Whether it's a superhero headquarters, a princess castle, or an underwater adventure, our themed experiences bring imagination to life with stunning decor, customized props, and immersive environments."
  },
  "personalized-return-gifts": {
    title: "Personalized Return Gifts",
    description: "Give your little guests something memorable to take home. We curate thoughtful, high-quality, and personalized return gifts that perfectly match the theme of your celebration, leaving a lasting impression on everyone."
  },
  "activity-experiences": {
    title: "Activity Experiences",
    description: "Keep the kids entertained with fun-filled and engaging activities. From magic shows and face painting to interactive workshops and DIY craft stations, we provide experiences that children will love and remember."
  },
  "digital-invitations": {
    title: "Digital Invitations",
    description: "Set the tone for your celebration right from the start. We design beautiful, custom e-invites and animated digital invitations that capture the excitement of the big day and make RSVPs a breeze."
  },
  "milestone-moments": {
    title: "Milestone Moments",
    description: "First birthdays, half-birthdays, and other major milestones deserve to be cherished. We create beautiful setups and capture these fleeting moments so you have memories to look back on forever."
  }
};

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = servicesDetails[params.slug];

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-dvh pt-[120px] pb-24 bg-surface">
      <div className="max-w-4xl mx-auto px-5 md:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-text-light hover:text-mocha transition-colors mb-12">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold mb-8">
          {service.title}
        </h1>
        
        <div className="prose prose-lg text-text-muted">
          <p className="text-lg md:text-xl leading-relaxed">
            {service.description}
          </p>
        </div>
      </div>
    </main>
  );
}
