"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { FormField } from "@/components/ui/FormField";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabNav } from "@/components/ui/TabNav";
import { useToast } from "@/components/ui/Toast";
import { TextArea, TextInput } from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { PageKey } from "@/types/cms";
import { PAGE_KEYS } from "@/types/cms";

const TAB_LABELS: Record<PageKey, string> = {
  home: "Home",
  about: "About",
  contact: "Contact",
};

function mediaFromSection(val: unknown): MediaRef | null {
  if (!val || typeof val !== "object") return null;
  const obj = val as Record<string, unknown>;
  if (typeof obj.id === "string" && typeof obj.url === "string") {
    return { id: obj.id, url: obj.url, altText: (obj.altText as string | null) ?? null };
  }
  return null;
}

function mediaToSection(media: MediaRef | null): { mediaId: string } {
  return { mediaId: media?.id ?? "" };
}

type HomeSections = {
  hero: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    backgroundImage: MediaRef | null;
  };
  deliverables: { title: string; subtitle: string };
  ourStory: { title: string; paragraphs: string[] };
  ctaBand: { headline: string; subheadline: string; ctaLabel: string; ctaHref: string };
};

type AboutSections = {
  hero: { title: string; subtitle: string };
  story: { title: string; paragraphs: string[] };
  values: { title: string; items: Array<{ title: string; description: string }> };
};

type ContactSections = {
  hero: { title: string; subtitle: string };
  info: { phone: string; email: string; address: string; hours: string };
  formLabels: { name: string; email: string; phone: string; message: string; submit: string };
  mapEmbedUrl: string;
};

const EMPTY_HOME: HomeSections = {
  hero: {
    eyebrow: "",
    headline: "",
    headlineAccent: "",
    subheadline: "",
    primaryCta: { label: "", href: "" },
    secondaryCta: { label: "", href: "" },
    backgroundImage: null,
  },
  deliverables: { title: "", subtitle: "" },
  ourStory: { title: "", paragraphs: [""] },
  ctaBand: { headline: "", subheadline: "", ctaLabel: "", ctaHref: "" },
};

const EMPTY_ABOUT: AboutSections = {
  hero: { title: "", subtitle: "" },
  story: { title: "", paragraphs: [""] },
  values: { title: "", items: [{ title: "", description: "" }] },
};

const EMPTY_CONTACT: ContactSections = {
  hero: { title: "", subtitle: "" },
  info: { phone: "", email: "", address: "", hours: "" },
  formLabels: { name: "", email: "", phone: "", message: "", submit: "" },
  mapEmbedUrl: "",
};

function parseHome(raw: Record<string, unknown>): HomeSections {
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  const deliverables = (raw.deliverables ?? {}) as Record<string, unknown>;
  const ourStory = (raw.ourStory ?? {}) as Record<string, unknown>;
  const ctaBand = (raw.ctaBand ?? {}) as Record<string, unknown>;
  const primaryCta = (hero.primaryCta ?? {}) as Record<string, string>;
  const secondaryCta = (hero.secondaryCta ?? {}) as Record<string, string>;
  return {
    hero: {
      eyebrow: String(hero.eyebrow ?? ""),
      headline: String(hero.headline ?? ""),
      headlineAccent: String(hero.headlineAccent ?? ""),
      subheadline: String(hero.subheadline ?? ""),
      primaryCta: { label: primaryCta.label ?? "", href: primaryCta.href ?? "" },
      secondaryCta: { label: secondaryCta.label ?? "", href: secondaryCta.href ?? "" },
      backgroundImage: mediaFromSection(hero.backgroundImage),
    },
    deliverables: {
      title: String(deliverables.title ?? ""),
      subtitle: String(deliverables.subtitle ?? ""),
    },
    ourStory: {
      title: String(ourStory.title ?? ""),
      paragraphs: Array.isArray(ourStory.paragraphs) ? ourStory.paragraphs.map(String) : [""],
    },
    ctaBand: {
      headline: String(ctaBand.headline ?? ""),
      subheadline: String(ctaBand.subheadline ?? ""),
      ctaLabel: String(ctaBand.ctaLabel ?? ""),
      ctaHref: String(ctaBand.ctaHref ?? ""),
    },
  };
}

function parseAbout(raw: Record<string, unknown>): AboutSections {
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  const story = (raw.story ?? {}) as Record<string, unknown>;
  const values = (raw.values ?? {}) as Record<string, unknown>;
  const items = Array.isArray(values.items)
    ? values.items.map((item) => {
        const o = item as Record<string, string>;
        return { title: o.title ?? "", description: o.description ?? "" };
      })
    : [{ title: "", description: "" }];
  return {
    hero: { title: String(hero.title ?? ""), subtitle: String(hero.subtitle ?? "") },
    story: {
      title: String(story.title ?? ""),
      paragraphs: Array.isArray(story.paragraphs) ? story.paragraphs.map(String) : [""],
    },
    values: { title: String(values.title ?? ""), items },
  };
}

function parseContact(raw: Record<string, unknown>): ContactSections {
  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  const info = (raw.info ?? {}) as Record<string, string>;
  const formLabels = (raw.formLabels ?? {}) as Record<string, string>;
  return {
    hero: { title: String(hero.title ?? ""), subtitle: String(hero.subtitle ?? "") },
    info: {
      phone: info.phone ?? "",
      email: info.email ?? "",
      address: info.address ?? "",
      hours: info.hours ?? "",
    },
    formLabels: {
      name: formLabels.name ?? "",
      email: formLabels.email ?? "",
      phone: formLabels.phone ?? "",
      message: formLabels.message ?? "",
      submit: formLabels.submit ?? "",
    },
    mapEmbedUrl: String(raw.mapEmbedUrl ?? ""),
  };
}

function serializeHome(form: HomeSections) {
  return {
    hero: {
      eyebrow: form.hero.eyebrow,
      headline: form.hero.headline,
      headlineAccent: form.hero.headlineAccent,
      subheadline: form.hero.subheadline,
      primaryCta: form.hero.primaryCta,
      secondaryCta: form.hero.secondaryCta,
      backgroundImage: mediaToSection(form.hero.backgroundImage),
    },
    deliverables: form.deliverables,
    ourStory: form.ourStory,
    ctaBand: form.ctaBand,
  };
}

function serializeAbout(form: AboutSections) {
  return { hero: form.hero, story: form.story, values: form.values };
}

function serializeContact(form: ContactSections) {
  return {
    hero: form.hero,
    info: form.info,
    formLabels: form.formLabels,
    mapEmbedUrl: form.mapEmbedUrl,
  };
}

export function StaticPagesScreen() {
  const [activeTab, setActiveTab] = useState<PageKey>("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [home, setHome] = useState<HomeSections>(EMPTY_HOME);
  const [about, setAbout] = useState<AboutSections>(EMPTY_ABOUT);
  const [contact, setContact] = useState<ContactSections>(EMPTY_CONTACT);
  const toast = useToast();

  async function loadPage(pageKey: PageKey) {
    const data = await adminFetch<{ sections: Record<string, unknown> }>(`/admin/pages/${pageKey}`);
    if (pageKey === "home") setHome(parseHome(data.sections));
    if (pageKey === "about") setAbout(parseAbout(data.sections));
    if (pageKey === "contact") setContact(parseContact(data.sections));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all(PAGE_KEYS.map((k) => loadPage(k)))
      .catch((err) =>
        toast({
          tone: "error",
          title: "Could not load page content",
          description: err instanceof AdminApiError ? err.message : undefined,
        }),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const sections =
        activeTab === "home"
          ? serializeHome(home)
          : activeTab === "about"
            ? serializeAbout(about)
            : serializeContact(contact);
      await adminFetch(`/admin/pages/${activeTab}`, { method: "PUT", body: { sections } });
      toast({ tone: "success", title: `${TAB_LABELS[activeTab]} page saved` });
      setDirty(false);
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not save page",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-(--radius-md)" />;
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Site Pages"
        description="Edit homepage, about, and contact page section content."
      />
      <TabNav
        tabs={PAGE_KEYS.map((k) => ({ id: k, label: TAB_LABELS[k] }))}
        active={activeTab}
        onChange={(id) => setActiveTab(id as PageKey)}
      />
      <form onSubmit={onSave} className="card space-y-6 p-5">
        {activeTab === "home" && (
          <>
            <section className="space-y-4">
              <h3 className="font-serif text-lg font-semibold">Hero</h3>
              <FormField label="Eyebrow" htmlFor="home-eyebrow">
                <TextInput id="home-eyebrow" value={home.hero.eyebrow} onChange={(e) => { setHome({ ...home, hero: { ...home.hero, eyebrow: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Headline" htmlFor="home-headline">
                <TextInput id="home-headline" value={home.hero.headline} onChange={(e) => { setHome({ ...home, hero: { ...home.hero, headline: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Headline accent" htmlFor="home-accent">
                <TextInput id="home-accent" value={home.hero.headlineAccent} onChange={(e) => { setHome({ ...home, hero: { ...home.hero, headlineAccent: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Subheadline" htmlFor="home-sub">
                <TextArea id="home-sub" value={home.hero.subheadline} onChange={(e) => { setHome({ ...home, hero: { ...home.hero, subheadline: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Background image" htmlFor="home-bg">
                <MediaPicker kind="media" value={home.hero.backgroundImage} onChange={(m) => { setHome({ ...home, hero: { ...home.hero, backgroundImage: m } }); setDirty(true); }} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Primary CTA label" htmlFor="home-pri-label">
                  <TextInput id="home-pri-label" value={home.hero.primaryCta.label} onChange={(e) => { setHome({ ...home, hero: { ...home.hero, primaryCta: { ...home.hero.primaryCta, label: e.target.value } } }); setDirty(true); }} />
                </FormField>
                <FormField label="Primary CTA link" htmlFor="home-pri-href">
                  <TextInput id="home-pri-href" value={home.hero.primaryCta.href} onChange={(e) => { setHome({ ...home, hero: { ...home.hero, primaryCta: { ...home.hero.primaryCta, href: e.target.value } } }); setDirty(true); }} />
                </FormField>
              </div>
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">Deliverables band</h3>
              <FormField label="Title" htmlFor="home-del-title">
                <TextInput id="home-del-title" value={home.deliverables.title} onChange={(e) => { setHome({ ...home, deliverables: { ...home.deliverables, title: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Subtitle" htmlFor="home-del-sub">
                <TextInput id="home-del-sub" value={home.deliverables.subtitle} onChange={(e) => { setHome({ ...home, deliverables: { ...home.deliverables, subtitle: e.target.value } }); setDirty(true); }} />
              </FormField>
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">Our story</h3>
              <FormField label="Title" htmlFor="home-story-title">
                <TextInput id="home-story-title" value={home.ourStory.title} onChange={(e) => { setHome({ ...home, ourStory: { ...home.ourStory, title: e.target.value } }); setDirty(true); }} />
              </FormField>
              {home.ourStory.paragraphs.map((p, i) => (
                <FormField key={i} label={`Paragraph ${i + 1}`} htmlFor={`home-story-p-${i}`}>
                  <TextArea
                    id={`home-story-p-${i}`}
                    value={p}
                    onChange={(e) => {
                      const paragraphs = [...home.ourStory.paragraphs];
                      paragraphs[i] = e.target.value;
                      setHome({ ...home, ourStory: { ...home.ourStory, paragraphs } });
                      setDirty(true);
                    }}
                  />
                </FormField>
              ))}
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">CTA band</h3>
              <FormField label="Headline" htmlFor="home-cta-head">
                <TextInput id="home-cta-head" value={home.ctaBand.headline} onChange={(e) => { setHome({ ...home, ctaBand: { ...home.ctaBand, headline: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Subheadline" htmlFor="home-cta-sub">
                <TextInput id="home-cta-sub" value={home.ctaBand.subheadline} onChange={(e) => { setHome({ ...home, ctaBand: { ...home.ctaBand, subheadline: e.target.value } }); setDirty(true); }} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Button label" htmlFor="home-cta-label">
                  <TextInput id="home-cta-label" value={home.ctaBand.ctaLabel} onChange={(e) => { setHome({ ...home, ctaBand: { ...home.ctaBand, ctaLabel: e.target.value } }); setDirty(true); }} />
                </FormField>
                <FormField label="Button link" htmlFor="home-cta-href">
                  <TextInput id="home-cta-href" value={home.ctaBand.ctaHref} onChange={(e) => { setHome({ ...home, ctaBand: { ...home.ctaBand, ctaHref: e.target.value } }); setDirty(true); }} />
                </FormField>
              </div>
            </section>
          </>
        )}

        {activeTab === "about" && (
          <>
            <section className="space-y-4">
              <h3 className="font-serif text-lg font-semibold">Hero</h3>
              <FormField label="Title" htmlFor="about-title">
                <TextInput id="about-title" value={about.hero.title} onChange={(e) => { setAbout({ ...about, hero: { ...about.hero, title: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Subtitle" htmlFor="about-sub">
                <TextInput id="about-sub" value={about.hero.subtitle} onChange={(e) => { setAbout({ ...about, hero: { ...about.hero, subtitle: e.target.value } }); setDirty(true); }} />
              </FormField>
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">Story</h3>
              <FormField label="Title" htmlFor="about-story-title">
                <TextInput id="about-story-title" value={about.story.title} onChange={(e) => { setAbout({ ...about, story: { ...about.story, title: e.target.value } }); setDirty(true); }} />
              </FormField>
              {about.story.paragraphs.map((p, i) => (
                <FormField key={i} label={`Paragraph ${i + 1}`} htmlFor={`about-story-p-${i}`}>
                  <TextArea
                    id={`about-story-p-${i}`}
                    value={p}
                    onChange={(e) => {
                      const paragraphs = [...about.story.paragraphs];
                      paragraphs[i] = e.target.value;
                      setAbout({ ...about, story: { ...about.story, paragraphs } });
                      setDirty(true);
                    }}
                  />
                </FormField>
              ))}
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">Values</h3>
              <FormField label="Section title" htmlFor="about-values-title">
                <TextInput id="about-values-title" value={about.values.title} onChange={(e) => { setAbout({ ...about, values: { ...about.values, title: e.target.value } }); setDirty(true); }} />
              </FormField>
              {about.values.items.map((item, i) => (
                <div key={i} className="grid gap-3 rounded border border-(--color-border-soft) p-3 sm:grid-cols-2">
                  <FormField label={`Value ${i + 1} title`} htmlFor={`about-val-t-${i}`}>
                    <TextInput
                      id={`about-val-t-${i}`}
                      value={item.title}
                      onChange={(e) => {
                        const items = [...about.values.items];
                        items[i] = { ...items[i], title: e.target.value };
                        setAbout({ ...about, values: { ...about.values, items } });
                        setDirty(true);
                      }}
                    />
                  </FormField>
                  <FormField label={`Value ${i + 1} description`} htmlFor={`about-val-d-${i}`}>
                    <TextArea
                      id={`about-val-d-${i}`}
                      value={item.description}
                      onChange={(e) => {
                        const items = [...about.values.items];
                        items[i] = { ...items[i], description: e.target.value };
                        setAbout({ ...about, values: { ...about.values, items } });
                        setDirty(true);
                      }}
                    />
                  </FormField>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary px-3 py-1.5 text-sm"
                onClick={() => {
                  setAbout({
                    ...about,
                    values: { ...about.values, items: [...about.values.items, { title: "", description: "" }] },
                  });
                  setDirty(true);
                }}
              >
                Add value
              </button>
            </section>
          </>
        )}

        {activeTab === "contact" && (
          <>
            <section className="space-y-4">
              <h3 className="font-serif text-lg font-semibold">Hero</h3>
              <FormField label="Title" htmlFor="contact-title">
                <TextInput id="contact-title" value={contact.hero.title} onChange={(e) => { setContact({ ...contact, hero: { ...contact.hero, title: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Subtitle" htmlFor="contact-sub">
                <TextInput id="contact-sub" value={contact.hero.subtitle} onChange={(e) => { setContact({ ...contact, hero: { ...contact.hero, subtitle: e.target.value } }); setDirty(true); }} />
              </FormField>
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">Contact info</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Phone" htmlFor="contact-phone">
                  <TextInput id="contact-phone" value={contact.info.phone} onChange={(e) => { setContact({ ...contact, info: { ...contact.info, phone: e.target.value } }); setDirty(true); }} />
                </FormField>
                <FormField label="Email" htmlFor="contact-email">
                  <TextInput id="contact-email" value={contact.info.email} onChange={(e) => { setContact({ ...contact, info: { ...contact.info, email: e.target.value } }); setDirty(true); }} />
                </FormField>
              </div>
              <FormField label="Address" htmlFor="contact-address">
                <TextArea id="contact-address" value={contact.info.address} onChange={(e) => { setContact({ ...contact, info: { ...contact.info, address: e.target.value } }); setDirty(true); }} />
              </FormField>
              <FormField label="Hours" htmlFor="contact-hours">
                <TextInput id="contact-hours" value={contact.info.hours} onChange={(e) => { setContact({ ...contact, info: { ...contact.info, hours: e.target.value } }); setDirty(true); }} />
              </FormField>
            </section>
            <section className="space-y-4 border-t border-(--color-border-soft) pt-6">
              <h3 className="font-serif text-lg font-semibold">Form labels</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["name", "email", "phone", "message", "submit"] as const).map((key) => (
                  <FormField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} htmlFor={`contact-label-${key}`}>
                    <TextInput
                      id={`contact-label-${key}`}
                      value={contact.formLabels[key]}
                      onChange={(e) => {
                        setContact({ ...contact, formLabels: { ...contact.formLabels, [key]: e.target.value } });
                        setDirty(true);
                      }}
                    />
                  </FormField>
                ))}
              </div>
            </section>
            <FormField label="Map embed URL" htmlFor="contact-map">
              <TextInput id="contact-map" value={contact.mapEmbedUrl} onChange={(e) => { setContact({ ...contact, mapEmbedUrl: e.target.value }); setDirty(true); }} />
            </FormField>
          </>
        )}

        <div className="flex items-center justify-between border-t border-(--color-border-soft) pt-4">
          {dirty && <span className="text-xs font-medium text-(--color-mocha-dark)">Unsaved changes</span>}
          <button type="submit" disabled={saving} className="btn btn-primary ml-auto px-4 py-2 text-sm">
            {saving ? "Saving…" : `Save ${TAB_LABELS[activeTab]}`}
          </button>
        </div>
      </form>
    </div>
  );
}
