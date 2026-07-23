"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { testimonialsRepo } from "@/lib/data/resources";

export default function TestimonialsPage() {
  return <ResourceScreen title="Testimonials" noun="Testimonial" description="Review customer feedback before displaying it publicly." repo={testimonialsRepo} fields={["name", "content", "isActive"]} />;
}

