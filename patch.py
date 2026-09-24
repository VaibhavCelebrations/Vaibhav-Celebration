import re

with open('frontend/src/components/layout/ChatbotWidget.tsx', 'r') as f:
    content = f.read()

# 1. State additions
content = content.replace(
    'const [formData, setFormData] = useState<Record<string, string>>({});',
    '''const [formData, setFormData] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const pathRef = useRef<string[]>([]);
  const formDataRef = useRef<Record<string, string>>({});

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);'''
)

# 2. Update finishFlow
content = content.replace(
    'submitSession(nodeId, node, path[path.length - 1] || "");',
    'submitSession(nodeId, node, pathRef.current[pathRef.current.length - 1] || "");'
)

# 3. Add processNextNode after finishFlow
finish_flow_end = '}, 1500);\\n    }\\n  };'
process_next_node = '''}, 1500);
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
  };'''
content = content.replace(finish_flow_end, process_next_node)


# 4. Replace initial open useEffect
old_init = '''  useEffect(() => {
    if (isOpen && history.length === 0) {
      const startNode = flow.nodes[flow.start];
      if (startNode?.question) {
        setHistory([{ role: "bot", text: startNode.question as string }]);
      } else if (startNode?.message) {
        setHistory([{ role: "bot", text: startNode.message as string }]);
      }
    }
  }, [isOpen, history.length, flow]);'''

new_init = '''  useEffect(() => {
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
  }, [isOpen, history.length, flow, isTyping]);'''
content = content.replace(old_init, new_init)


# 5. Replace auto-advance useEffect
old_auto = '''  useEffect(() => {
    const currentNode = flow.nodes[currentNodeId];
    if (currentNode && !currentNode.options && !currentNode.collectField && !currentNode.collectFields && currentNode.next) {
      const timer = setTimeout(() => {
        const nextNode = flow.nodes[currentNode.next!];
        if (nextNode) {
          setCurrentNodeId(currentNode.next!);
          if (nextNode.question) {
            setHistory((prev) => [...prev, { role: "bot", text: nextNode.question as string }]);
          } else if (nextNode.message) {
            setHistory((prev) => [...prev, { role: "bot", text: nextNode.message as string }]);
          }
          
          if (nextNode.createLead !== undefined && !nextNode.collectField && !nextNode.collectFields) {
            finishFlow(currentNode.next!, nextNode);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentNodeId, flow, path]);'''

new_auto = '''  useEffect(() => {
    const currentNode = flow.nodes[currentNodeId];
    if (!isTyping && currentNode && !currentNode.options && !currentNode.collectField && !currentNode.collectFields && currentNode.next) {
      processNextNode(currentNode.next);
    }
  }, [currentNodeId, flow, path, isTyping]);'''
content = content.replace(old_auto, new_auto)


# 6. Replace handleOptionClick
old_click = '''  const handleOptionClick = (option: { label: string; next: string }) => {
    setHistory((prev) => [...prev, { role: "user", text: option.label }]);
    setPath((prev) => [...prev, option.label]);
    
    const nextNode = flow.nodes[option.next];
    if (nextNode) {
      setCurrentNodeId(option.next);
      if (nextNode.question) {
        setHistory((prev) => [...prev, { role: "bot", text: nextNode.question as string }]);
      } else if (nextNode.message) {
        setHistory((prev) => [...prev, { role: "bot", text: nextNode.message as string }]);
      }
      
      // Auto-submit if it's an END node without fields
      if (nextNode.createLead !== undefined && !nextNode.collectField && !nextNode.collectFields) {
        finishFlow(option.next, nextNode);
      }
    }
  };'''

new_click = '''  const handleOptionClick = (option: { label: string; next: string }) => {
    setHistory((prev) => [...prev, { role: "user", text: option.label }]);
    setPath((prev) => [...prev, option.label]);
    processNextNode(option.next);
  };'''
content = content.replace(old_click, new_click)


# 7. Replace handleFieldSubmit
old_submit = '''  const handleFieldSubmit = async (e: React.FormEvent) => {
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
      const nextNode = flow.nodes[currentNode.next];
      setCurrentNodeId(currentNode.next);
      
      if (nextNode?.question) {
        setHistory((prev) => [...prev, { role: "bot", text: nextNode.question as string }]);
      } else if (nextNode?.message) {
        setHistory((prev) => [...prev, { role: "bot", text: nextNode.message as string }]);
      }

      // Auto-submit if it's an END node
      if (nextNode?.createLead !== undefined && !nextNode.collectField && !nextNode.collectFields) {
        finishFlow(currentNode.next, nextNode);
      }
    } else if (currentNode.createLead !== undefined) {
      // Reached an end node directly after fields
      setHistory((prev) => [...prev, { role: "bot", text: "Thank you! We have received your details." }]);
      finishFlow(currentNodeId, currentNode);
    }
  };'''

new_submit = '''  const handleFieldSubmit = async (e: React.FormEvent) => {
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
  };'''
content = content.replace(old_submit, new_submit)


# 8. Update submitSession refs
old_submitSession = '''  const submitSession = async (nodeId: string, node: any, lastChoice: string) => {
    setIsSubmitting(true);
    try {
      await saveChatbotSession({
        path: { steps: path, finalNode: nodeId, data: formData },
        resultTag: lastChoice,
        createLead: node.createLead,
        lead: node.createLead ? {
          name: formData.name || "Unknown",
          email: formData.email,
          phone: formData.phone,
          interestArea: lastChoice,
        } : undefined,
      });'''

new_submitSession = '''  const submitSession = async (nodeId: string, node: any, lastChoice: string) => {
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
      });'''
content = content.replace(old_submitSession, new_submitSession)


# 9. Inject typing indicator in Chat History
old_chat = '''            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Inputs area */}'''

new_chat = '''            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-[var(--color-text)] rounded-tl-sm shadow-sm border border-[var(--color-border-light)] flex items-center gap-1 h-[36px]">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Inputs area */}'''
content = content.replace(old_chat, new_chat)


# 10. Hide inputs when isTyping
content = content.replace('!isFinished && currentNode?.options &&', '!isTyping && !isFinished && currentNode?.options &&')
content = content.replace('!isFinished && currentNode?.collectField &&', '!isTyping && !isFinished && currentNode?.collectField &&')
content = content.replace('!isFinished && currentNode?.collectFields &&', '!isTyping && !isFinished && currentNode?.collectFields &&')


with open('frontend/src/components/layout/ChatbotWidget.tsx', 'w') as f:
    f.write(content)
print('Patched successfully!')
