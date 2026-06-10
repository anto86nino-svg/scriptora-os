import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ReadAloudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  chapterText: string;
}

export function ReadAloudModal({
  open,
  onOpenChange,
  title,
  chapterText,
}: ReadAloudModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = () => {
    if (typeof window === "undefined") return;

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setStatus("Stopped");
  };

  const handlePlay = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (!chapterText?.trim()) {
      setStatus("No chapter text found.");
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const looksEnglish =
      /\b(the|you|and|your|mindset|chapter|spark|discipline)\b/i.test(chapterText);

    const utterance = new SpeechSynthesisUtterance(chapterText.slice(0, 5000));
    utterance.lang = looksEnglish ? "en-US" : "it-IT";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsPlaying(true);
      setStatus("Reading chapter...");
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setStatus("Chapter completed");
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setStatus("Unable to play audio.");
    };

    utteranceRef.current = utterance;

    try {
      const unlock = new SpeechSynthesisUtterance(" ");
      unlock.volume = 0;
      synth.speak(unlock);

      window.setTimeout(() => {
        try {
          synth.cancel();

          const voices = synth.getVoices() || [];
          const preferredVoice =
            voices.find((voice) => voice.lang?.toLowerCase().startsWith(looksEnglish ? "en" : "it")) ||
            voices.find((voice) => voice.lang?.toLowerCase().startsWith(looksEnglish ? "it" : "en")) ||
            voices[0];

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          synth.speak(utterance);
        } catch (error) {
          console.error("[SCRIPTORA SPEECH PLAYBACK ERROR]", error);
          setIsPlaying(false);
          setStatus("Unable to play audio.");
        }
      }, 250);
    } catch (error) {
      console.error("[SCRIPTORA MOBILE SPEECH FAILED]", error);
      setIsPlaying(false);
      setStatus("Unable to play audio.");
    }
  };

  useEffect(() => {
    if (!open) stopSpeech();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4">
        <DialogHeader>
          <DialogTitle>Scriptora Read Aloud</DialogTitle>
          <DialogDescription>
            Listen to your chapter aloud to catch pacing, repetition, and unnatural prose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Current chapter
            </p>
            <h3 className="text-lg font-semibold">
              {title || "Untitled Chapter"}
            </h3>
          </div>

          <button
            type="button"
            onClick={handlePlay}
            disabled={isPlaying}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {isPlaying ? "Reading..." : "Play Narration"}
          </button>

          <button
            type="button"
            onClick={stopSpeech}
            className="w-full h-11 rounded-xl border border-border"
          >
            Stop
          </button>

          <div className="text-sm text-center text-muted-foreground">
            {status}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
