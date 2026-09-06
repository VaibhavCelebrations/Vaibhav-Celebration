import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin, Sparkles } from "lucide-react";
import type { EventCard } from "@/lib/cms/types";

interface FeaturedEventCardProps {
  event: EventCard;
  priority?: boolean;
}

export function FeaturedEventCard({ event, priority = true }: FeaturedEventCardProps) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden border border-border-light shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
    >
      {/* Visual / Media side */}
      <div className="w-full md:w-[52%] lg:w-[55%] relative aspect-[16/10] md:aspect-auto min-h-[280px] md:min-h-[380px] overflow-hidden bg-cream-dark">
        {event.coverImage ? (
          <Image
            src={event.coverImage}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 55vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-cream-dark text-mocha/40">
            <Sparkles size={48} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Floating Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          {event.theme ? (
            <span className="bg-charcoal/85 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              {event.theme}
            </span>
          ) : (
            <span className="bg-mocha/90 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              Featured Experience
            </span>
          )}

          {event.isRegistrationOpen && (
            <span className="bg-white/95 backdrop-blur-md text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Registration Open
            </span>
          )}
        </div>
      </div>

      {/* Content side */}
      <div className="w-full md:w-[48%] lg:w-[45%] p-7 md:p-9 lg:p-11 flex flex-col justify-between bg-white">
        <div>
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-muted mb-4">
            {event.date && (
              <span className="inline-flex items-center gap-1.5 text-mocha font-semibold bg-cream px-3 py-1 rounded-full">
                <Calendar size={13} />
                <span>{event.date}</span>
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-border-light/60 px-2.5 py-1 rounded-full">
                <MapPin size={13} className="text-mocha" />
                <span>{event.location}</span>
              </span>
            )}
            {event.ageGroup && (
              <span className="text-text-muted/80">
                Ages: {event.ageGroup}
              </span>
            )}
          </div>

          <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-charcoal leading-[1.2] mb-4 group-hover:text-mocha transition-colors">
            {event.title}
          </h3>

          <div
            className="prose prose-sm text-text-muted leading-relaxed line-clamp-3 md:line-clamp-4 mb-6"
            dangerouslySetInnerHTML={{ __html: event.shortDescription }}
          />
        </div>

        {/* Action link */}
        <div className="pt-4 border-t border-border-light flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-mocha font-bold text-sm md:text-base group-hover:text-mocha-dark transition-colors">
            View Celebration Details
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1.5" />
          </span>
          <span className="text-xs text-text-light font-medium group-hover:text-charcoal transition-colors">
            Explore photos & highlights &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
