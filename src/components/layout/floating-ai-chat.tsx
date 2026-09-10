'use client';

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Bot, X, Send, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { runClinicalAgent } from "@/lib/ai-client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
            const result = await runClinicalAgent({
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
        <>
            {/* Centered Chat Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl w-full h-[80vh] flex flex-col p-0 gap-0 overflow-hidden border-dashed">
                    <DialogHeader className="p-4 border-b border-dashed bg-muted/20">
                        <div className="flex items-center justify-between w-full pr-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/10 text-primary">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <DialogTitle className="font-bold text-base">Orelis Clinical Agent</DialogTitle>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <ShieldAlert size={12} className="text-amber-500" />
                                        Read + Write · No Deletes
                                    </p>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex flex-1 overflow-hidden bg-background">
                        {/* Right side: Chat Area */}
                        <div className="flex-1 flex flex-col w-full h-full">
                            <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
                                            <Bot size={16} />
                                        </div>
                                        <div className="bg-muted p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed max-w-[85%] text-foreground font-medium border border-dashed border-muted-foreground/20">
                                            Hello Doctor. I am your clinical agent. I can read records, schedule appointments, draft encounters, and send emails/links to patients. How can I help you today?
                                        </div>
                                    </div>

                                    {messages.map((message, index) => (
                                        <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? "flex-row-reverse" : "")}>
                                            <div className={cn(
                                                "p-2 rounded-full flex-shrink-0",
                                                message.role === 'user' ? "bg-muted text-foreground" : "bg-primary/10 text-primary"
                                            )}>
                                                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                            </div>
                                            <div className={cn(
                                                "p-4 rounded-2xl text-sm leading-relaxed max-w-[85%]",
                                                message.role === 'user'
                                                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                                                    : "bg-muted rounded-tl-none prose prose-sm dark:prose-invert prose-slate max-w-none prose-a:text-primary hover:prose-a:underline text-foreground font-medium border border-dashed border-muted-foreground/20"
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
                                            <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
                                                <Bot size={16} />
                                            </div>
                                            <div className="bg-muted p-4 rounded-2xl rounded-tl-none border border-dashed border-muted-foreground/20">
                                                <div className="flex gap-1.5 items-center h-5">
                                                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                                                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Composer */}
                            <form onSubmit={handleSubmit} className="p-4 md:p-6 pt-0 border-t border-dashed bg-background/50 backdrop-blur">
                                <div className="relative mt-4">
                                    <Input
                                        placeholder="Command the agent (e.g. 'List today's appointments')..."
                                        className="pr-14 h-14 rounded-2xl border-dashed bg-muted/30 shadow-inner focus-visible:ring-1"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all"
                                        disabled={!input.trim() || isLoading}
                                    >
                                        <Send size={18} />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-center mt-3 text-muted-foreground font-medium uppercase tracking-wider">
                                    AI can make mistakes. Verify clinical data.
                                </p>
                            </form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Floating FAB Trigger */}
            <div className="fixed bottom-24 md:bottom-6 right-6 z-40 pointer-events-none">
                <Button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "h-14 w-14 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group relative pointer-events-auto",
                        isOpen ? "scale-0 opacity-0" : "bg-primary text-primary-foreground scale-100 opacity-100"
                    )}
                >
                    <Bot size={24} />
                </Button>
            </div>
        </>
    );
}
