
'use client';

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Sparkles, X, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { askSupportQuestion } from "@/lib/ai-client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";

type Message = {
    role: 'user' | 'ai';
    content: string;
};

export function FloatingAiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await askSupportQuestion({
                question: input,
                history: messages,
            });
            if (result.ok) {
                const aiMessage: Message = { role: 'ai', content: result.data?.answer || '' };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error("AI chat error:", error);
            toast({
                title: "AI Assistant Error",
                description: error instanceof Error
                    ? error.message
                    : "Sorry, I couldn't process that request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[350px] sm:w-[400px] h-[500px] bg-background border border-dashed rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto">
                    <div className="p-4 border-b border-dashed bg-primary/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/20 text-primary">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Orelis AI Assistant</h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Always Active</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full">
                            <X size={18} />
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                                    <Sparkles size={14} />
                                </div>
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed max-w-[85%] text-slate-950 dark:text-slate-50 font-medium">
                                    Hello! I'm your Orelis AI assistant. Ask me anything about managing your clinic or using the platform.
                                </div>
                            </div>

                            {messages.map((message, index) => (
                                <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? "flex-row-reverse" : "")}>
                                    <div className={cn(
                                        "p-1.5 rounded-full flex-shrink-0",
                                        message.role === 'user' ? "bg-muted text-foreground" : "bg-primary/10 text-primary"
                                    )}>
                                        {message.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-xs leading-relaxed max-w-[85%]",
                                        message.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted rounded-tl-none prose prose-sm dark:prose-invert prose-slate max-w-none prose-a:text-primary hover:prose-a:underline text-slate-950 dark:text-slate-50 font-medium"
                                    )}>
                                        {message.role === 'ai' ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {message.content}
                                            </ReactMarkdown>
                                        ) : message.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="bg-muted p-3 rounded-2xl rounded-tl-none">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce h-1 w-1" />
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s] h-1 w-1" />
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s] h-1 w-1" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <form onSubmit={handleSubmit} className="p-4 border-t border-dashed bg-muted/20">
                        <div className="relative">
                            <Input
                                placeholder="Type your question..."
                                className="pr-12 h-11 rounded-xl border-dashed"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg"
                                disabled={!input.trim() || isLoading}
                            >
                                <Send size={16} />
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Floating Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group relative pointer-events-auto",
                    isOpen ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                )}
            >
                {!isOpen && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />}
                {isOpen ? <X size={24} /> : <Sparkles size={24} />}
            </Button>
        </div>
    );
}

