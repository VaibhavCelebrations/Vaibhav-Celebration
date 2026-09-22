"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, X, Send, RotateCcw, Loader2 } from "lucide-react";
import type { ChatbotFlow } from "@/lib/chatbot-api";
import { saveChatbotSession } from "@/lib/chatbot-api";
import { Button } from "@/components/ui/Button";

type ChatbotWidgetProps = {
  flow: ChatbotFlow;
};

export function ChatbotWidget({ flow }: ChatbotWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string>(flow.start);
  const [history, setHistory] = useState<{ role: "bot" | "user"; text: string }[]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const pathRef = useRef<string[]>([]);
  const formDataRef = useRef<Record<string, string>>({});

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  
  const finishFlow = (nodeId: string, node: any) => {
    submitSession(nodeId, node, pathRef.current[pathRef.current.length - 1] || "");
    setIsFinished(true);
    if (node.redirect) {
      setTimeout(() => {
        setIsOpen(false);
        router.push(node.redirect);
        // Reset state after transition so it's clean for next open
        setTimeout(() => handleRestart(), 300);
      }, 1500);
    }
  };

  const processNextNode = (nextNodeId: string) => {
    const nextNode = flow.nodes[nextNodeId];
    if (!nextNode) return;
    
    setCurrentNodeId(nextNodeId);
    
    const botText = (nextNode.question || nextNode.message) as string;
    if (botText) {
      setIsTyping(true);
      setTimeout(() => {
        setHistory((prev) => [...prev, { role: "bot", text: botText }]);
        setIsTyping(false);
        if (nextNode.createLead !== undefined && !nextNode.collectField && !nextNode.collectFields) {
          finishFlow(nextNodeId, nextNode);
        }
      }, 800);
    } else {
      if (nextNode.createLead !== undefined && !nextNode.collectField && !nextNode.collectFields) {
        finishFlow(nextNodeId, nextNode);
      }
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, currentNodeId]);

  // Initial bot message on open
  useEffect(() => {
    if (isOpen && history.length === 0 && !isTyping) {
      const startNode = flow.nodes[flow.start];
      const botText = (startNode?.question || startNode?.message) as string;
      if (botText) {
        setIsTyping(true);
        setTimeout(() => {
          setHistory([{ role: "bot", text: botText }]);
          setIsTyping(false);
        }, 800);
      }
    }
  }, [isOpen, history.length, flow, isTyping]);

  // Auto-advance for intermediate nodes with no interaction but a 'next' pointer
  useEffect(() => {
    const currentNode = flow.nodes[currentNodeId];
    if (!isTyping && currentNode && !currentNode.options && !currentNode.collectField && !currentNode.collectFields && currentNode.next) {
      processNextNode(currentNode.next);
    }
  }, [currentNodeId, flow, path, isTyping]);

  const handleOptionClick = (option: { label: string; next: string }) => {
    setHistory((prev) => [...prev, { role: "user", text: option.label }]);
    setPath((prev) => [...prev, option.label]);
    processNextNode(option.next);
  };

  const handleFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentNode = flow.nodes[currentNodeId];
    if (!currentNode) return;

    let userText = "";
    if (currentNode.collectField) {
      userText = formData[currentNode.collectField] || "";
    } else if (currentNode.collectFields) {
      userText = "Provided details";
    }

    setHistory((prev) => [...prev, { role: "user", text: userText }]);
    
    if (currentNode.next) {
      processNextNode(currentNode.next);
    } else if (currentNode.createLead !== undefined) {
      // Reached an end node directly after fields
      setIsTyping(true);
      setTimeout(() => {
        setHistory((prev) => [...prev, { role: "bot", text: "Thank you! We have received your details." }]);
        setIsTyping(false);
        finishFlow(currentNodeId, currentNode);
      }, 800);
    }
  };

  const submitSession = async (nodeId: string, node: any, lastChoice: string) => {
    setIsSubmitting(true);
    try {
      await saveChatbotSession({
        path: { steps: pathRef.current, finalNode: nodeId, data: formDataRef.current },
        resultTag: lastChoice,
        createLead: node.createLead,
        lead: node.createLead ? {
          name: formDataRef.current.name || "Unknown",
          email: formDataRef.current.email,
          phone: formDataRef.current.phone,
          interestArea: lastChoice,
        } : undefined,
      });
    } catch (error) {
      console.error("Failed to save chatbot session", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setCurrentNodeId(flow.start);
    setHistory([]);
    setPath([]);
    setFormData({});
    setIsFinished(false);
  };

  // Push FAB up if on checkout flows
  const isCheckoutFlow = pathname?.startsWith("/checkout") || pathname?.startsWith("/build-package");
  const bottomClass = isCheckoutFlow ? "bottom-[100px] md:bottom-6" : "bottom-6";

  const currentNode = flow.nodes[currentNodeId];
  const hasOptions = currentNode?.options && currentNode.options.length > 0;
  const hasForm = !!currentNode?.collectField || (currentNode?.collectFields && currentNode.collectFields.length > 0);
  const showInteractions = !isFinished && (hasOptions || hasForm);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed left-5 md:left-6 z-[90] flex items-center justify-center gap-2 rounded-full bg-[var(--color-mocha)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${bottomClass} p-3 md:px-4 md:py-3 group ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Open Chat"
      >
        <MessageCircle size={24} />
      </button>

      {isOpen && (
        <div className={`fixed left-5 md:left-6 z-[100] w-[calc(100vw-40px)] md:w-[380px] bg-white rounded-2xl shadow-[var(--shadow-lift)] overflow-hidden flex flex-col border border-[var(--color-border)] transition-all duration-300 origin-bottom-left ${bottomClass} h-[500px] max-h-[80vh]`}>
          {/* Header */}
          <div className="bg-[var(--color-mocha)] text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-display font-medium text-lg">Vaibhav Celebrations</h3>
              <p className="text-xs opacity-80">We usually reply instantly</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
              aria-label="Close Chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 bg-[var(--color-cream-dark)]/30 space-y-4">
            {history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "bot" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === "bot" ? "bg-white text-[var(--color-text)] rounded-tl-sm shadow-sm border border-[var(--color-border-light)]" : "bg-[var(--color-mocha)] text-white rounded-tr-sm shadow-sm"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-3xl rounded-bl-sm px-4 py-3 bg-[var(--color-mocha)] flex items-center gap-1.5 h-[38px] shadow-sm">
                  <span className="w-2 h-2 bg-white/90 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-white/90 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-white/90 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Inputs area */}
          <div className="p-4 bg-white border-t border-[var(--color-border)] min-h-[80px]">
            {isFinished && currentNode?.redirect && (
              <div className="flex flex-col items-center justify-center py-2 gap-2 text-[var(--color-mocha)]">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-medium animate-pulse">Redirecting...</span>
              </div>
            )}
            {!isTyping && !isFinished && currentNode?.options && (
              <div className="flex flex-col gap-2">
                {currentNode.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt)}
                    className="w-full text-left px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] hover:border-[var(--color-mocha)] hover:bg-[var(--color-blush-light)] transition-colors text-[var(--color-charcoal)]"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {!isTyping && !isFinished && currentNode?.collectField && (
              <form onSubmit={handleFieldSubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={currentNode.collectField === "eventDate" ? "dd/mm/yyyy" : "Type your answer..."}
                  pattern={currentNode.collectField === "eventDate" ? "\\d{2}/\\d{2}/\\d{4}" : undefined}
                  title={currentNode.collectField === "eventDate" ? "Please enter date in dd/mm/yyyy format" : undefined}
                  className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-mocha)]"
                  value={formData[currentNode.collectField] || ""}
                  maxLength={currentNode.collectField === "eventDate" ? 10 : undefined}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (currentNode.collectField === "eventDate") {
                      // Remove non-numeric characters
                      val = val.replace(/\D/g, "");
                      // Auto format to dd/mm/yyyy
                      if (val.length > 2 && val.length <= 4) {
                        val = val.slice(0, 2) + "/" + val.slice(2);
                      } else if (val.length > 4) {
                        val = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4, 8);
                      }
                    }
                    setFormData({ ...formData, [currentNode.collectField!]: val });
                  }}
                />
                {(() => {
                  const isValid = !!formData[currentNode.collectField!];
                  return (
                    <Button 
                      type="submit" 
                      size="sm" 
                      className={`px-3 transition-colors duration-300 ${isValid ? "!bg-[var(--color-mocha)] hover:!bg-[#5A4336]" : "opacity-80"}`} 
                      disabled={isSubmitting}
                    >
                      <Send size={16} />
                    </Button>
                  );
                })()}
              </form>
            )}

            {!isTyping && !isFinished && currentNode?.collectFields && (
              <form onSubmit={handleFieldSubmit} className="flex flex-col gap-3">
                {currentNode.collectFields.map((field) => (
                  <input
                    key={field}
                    type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                    required={field === "name" || field === "phone"}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    maxLength={field === "phone" ? 10 : undefined}
                    className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-mocha)]"
                    value={formData[field] || ""}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (field === "phone") {
                        val = val.replace(/\D/g, "");
                      }
                      setFormData({ ...formData, [field]: val });
                    }}
                  />
                ))}
                {(() => {
                  const isValid = currentNode.collectFields!.every(field => 
                    (field === "name" || field === "phone") ? !!formData[field] : true
                  );
                  return (
                    <Button 
                      type="submit" 
                      className={`w-full transition-colors duration-300 ${isValid ? "!bg-[var(--color-mocha)] hover:!bg-[#5A4336]" : "opacity-80"}`} 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Submit"}
                    </Button>
                  );
                })()}
              </form>
            )}

            {isFinished && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-charcoal)] transition-colors"
                >
                  <RotateCcw size={14} /> Start over
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
