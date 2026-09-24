"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api-client";
import { RoleGate } from "@/components/AdminSessionContext";

function ChatbotScreen() {
  const [flowJson, setFlowJson] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    adminFetch<any>("/chatbot/flow")
      .then((data) => {
        setFlowJson(JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        setError(err.message || "Failed to load flow");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    let parsedFlow;
    
    try {
      parsedFlow = JSON.parse(flowJson);
    } catch (e) {
      setError("Invalid JSON format. Please fix any syntax errors.");
      return;
    }

    setIsSaving(true);
    try {
      await adminFetch("/admin/chatbot/flow", {
        method: "PUT",
        body: { flow: parsedFlow },
      });
      setSuccess("Chatbot flow updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update flow");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="skeleton h-64 w-full rounded-[var(--radius-md)]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbot Flow</h1>
          <p className="text-[var(--color-text-muted)]">Configure the static chatbot conversation options.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] bg-[var(--color-mocha)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-mocha-light)] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Flow"}
        </button>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-600 border border-green-200">
          {success}
        </div>
      )}

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-ivory)] px-4 py-3">
          <h3 className="text-sm font-medium text-[var(--color-text)]">Configuration (JSON)</h3>
        </div>
        <div className="p-0">
          <textarea
            value={flowJson}
            onChange={(e) => setFlowJson(e.target.value)}
            className="w-full min-h-[600px] p-4 font-mono text-sm focus:outline-none resize-y"
            spellCheck={false}
          />
        </div>
      </div>
      
      <div className="rounded-[var(--radius-md)] bg-[var(--color-ivory)] p-4 text-sm text-[var(--color-text-muted)] border border-[var(--color-border)]">
        <h4 className="font-medium text-[var(--color-charcoal)] mb-2">Instructions</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>start</strong>: The key of the first node to show.</li>
          <li><strong>question / message</strong>: The text the bot will display.</li>
          <li><strong>options</strong>: An array of choices. Each needs a <code className="bg-white px-1 rounded border">label</code> and <code className="bg-white px-1 rounded border">next</code> node key.</li>
          <li><strong>collectField</strong>: Shows a text input and stores the value under this key (e.g., "eventDate").</li>
          <li><strong>collectFields</strong>: Shows a form to collect <code className="bg-white px-1 rounded border">["name", "email", "phone"]</code>.</li>
          <li><strong>createLead</strong>: If true, saves the collected data and chosen path as a lead in the CRM.</li>
        </ul>
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <ChatbotScreen />
    </RoleGate>
  );
}
