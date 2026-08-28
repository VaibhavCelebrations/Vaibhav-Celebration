import type { WhatsAppStatus } from "./status";

export type WhatsAppDocument = {
  /** Publicly reachable HTTPS URL Meta can fetch (never localhost, never behind auth). */
  url: string;
  filename: string;
};

/** A single WhatsApp template message to send, already resolved from the template registry (templates.ts). */
export type SendTemplateMessageInput = {
  toPhoneE164: string;
  templateName: string;
  languageCode: string;
  bodyParameters: string[];
  /** Optional document header (invoice PDF, etc.) — when present, providers must use the document-template path. */
  document?: WhatsAppDocument;
};

export type WhatsAppSendOutcome = {
  status: WhatsAppStatus;
  providerMessageId?: string;
};

/**
 * Provider abstraction — business/communication-service code depends only on
 * this interface, never on Meta's or the mock's implementation details.
 */
export interface WhatsAppProvider {
  readonly name: "meta" | "mock";
  /** Sends a plain (no-document) template message. Throws WhatsAppSendError on failure. */
  sendTemplateMessage(input: Omit<SendTemplateMessageInput, "document">): Promise<WhatsAppSendOutcome>;
  /** Sends a template message with a document header (e.g. invoice PDF). Throws WhatsAppSendError on failure. */
  sendDocumentTemplateMessage(input: SendTemplateMessageInput & { document: WhatsAppDocument }): Promise<WhatsAppSendOutcome>;
}
