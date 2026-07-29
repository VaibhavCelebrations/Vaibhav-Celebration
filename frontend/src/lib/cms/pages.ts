import { apiFetch } from "@/lib/api-client";
import type {
  AboutPageSections,
  ContactPageSections,
  HomePageSections,
  PageContent,
  PageKey,
} from "./types";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function getPageContent<K extends PageKey>(
  pageKey: K,
): Promise<PageContent<
  K extends "home" ? HomePageSections : K extends "about" ? AboutPageSections : ContactPageSections
>> {
  return apiFetch(`/pages/${pageKey}`, cmsFetchOptions(CMS_TAGS.page(pageKey)));
}

export async function getHomePageContent() {
  return getPageContent("home");
}

export async function getAboutPageContent() {
  return getPageContent("about");
}

export async function getContactPageContent() {
  return getPageContent("contact");
}
