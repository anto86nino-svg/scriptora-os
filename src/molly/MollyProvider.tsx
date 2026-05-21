import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultState,
  feed as feedFn,
  drink as drinkFn,
  sleep as sleepFn,
  play as playFn,
  type MollyState,
  type MollyVisual,
} from "./mollyEngine";
import { loadState, saveState } from "./mollyStorage";
import { askMolly, type ChatTurn } from "./mollyAI";

export interface MollyMessage {
  id: string;
  role: "molly" | "user";
  text: string;
  ts: number;
}

interface MollyContextValue {
  state: MollyState;
  messages: MollyMessage[];
  isThinking: boolean;
  feed: () => void;
  drink: () => void;
  sleep: () => void;
  play: () => void;
  sendUserMessage: (text: string) => Promise<void>;
  notifyUserWroteText: (text: string) => void;
  clearMessages: () => void;
}

const MollyContext = createContext<MollyContextValue | null>(null);
const MAX_MESSAGES = 30;
const ACTION_VISUAL_MS = 4500;

export function MollyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MollyState>(() => loadState() ?? defaultState());
  const [messages, setMessages] = useState<MollyMessage[]>([]);
  const [isThinking, setThinking] = useState(false);

  const actionResetRef = useRef<number | null>(null);

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    return () => {
      if (actionResetRef.current) window.clearTimeout(actionResetRef.current);
    };
  }, []);

  const pushMolly = useCallback((text: string) => {
    setMessages(prev => [
      ...prev,
      { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role: "molly" as const, text, ts: Date.now() },
    ].slice(-MAX_MESSAGES));
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user" as const, text, ts: Date.now() },
    ].slice(-MAX_MESSAGES));
  }, []);

  const resetVisualAfter = useCallback((ms: number) => {
    if (actionResetRef.current) window.clearTimeout(actionResetRef.current);
    actionResetRef.current = window.setTimeout(() => {
      setState(prev => ({ ...prev, visual: "idle" }));
    }, ms);
  }, []);

  const feed = useCallback(() => {
    setState(prev => feedFn(prev));
    resetVisualAfter(ACTION_VISUAL_MS);
    pushMolly("Mmm. Thank you.");
  }, [pushMolly, resetVisualAfter]);

  const drink = useCallback(() => {
    setState(prev => drinkFn(prev));
    resetVisualAfter(3500);
    pushMolly("Better.");
  }, [pushMolly, resetVisualAfter]);

  const sleep = useCallback(() => {
    setState(prev => sleepFn(prev));
    resetVisualAfter(7000);
    pushMolly("Just a quick nap…");
  }, [pushMolly, resetVisualAfter]);

  const play = useCallback(() => {
    setState(prev => playFn(prev));
    resetVisualAfter(ACTION_VISUAL_MS);
    pushMolly("Yes! Again!");
  }, [pushMolly, resetVisualAfter]);

  const sendUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushUser(trimmed);
    setThinking(true);
    const history: ChatTurn[] = messages.slice(-6).map(m => ({
      role: m.role === "molly" ? "assistant" : "user",
      content: m.text,
    }));
    try {
      const reply = await askMolly(trimmed, history, state.mood, state.bond);
      pushMolly(reply);
      setState(prev => ({ ...prev, bond: Math.min(100, prev.bond + 1) }));
    } finally {
      setThinking(false);
    }
  }, [messages, state.mood, state.bond, pushMolly, pushUser]);

  const notifyUserWroteText = useCallback((_text: string) => {
    // Molly is now manual-only: no background flow comments from editor text.
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const value = useMemo<MollyContextValue>(() => ({
    state, messages, isThinking,
    feed, drink, sleep, play,
    sendUserMessage, notifyUserWroteText, clearMessages,
  }), [state, messages, isThinking, feed, drink, sleep, play, sendUserMessage, notifyUserWroteText, clearMessages]);

  return <MollyContext.Provider value={value}>{children}</MollyContext.Provider>;
}

export function useMolly(): MollyContextValue {
  const ctx = useContext(MollyContext);
  if (!ctx) throw new Error("useMolly must be used inside MollyProvider");
  return ctx;
}

export type { MollyState, MollyVisual };
