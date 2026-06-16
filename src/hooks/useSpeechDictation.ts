import { useCallback, useMemo, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeechDictation(language?: string) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);

  const lang = useMemo(() => {
    const normalized = (language || "Italian").toLowerCase();
    if (normalized.startsWith("english")) return "en-US";
    if (normalized.startsWith("spanish")) return "es-ES";
    if (normalized.startsWith("french")) return "fr-FR";
    if (normalized.startsWith("german")) return "de-DE";
    return "it-IT";
  }, [language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(
    (onText: (text: string) => void) => {
      const SpeechRecognition = getSpeechRecognitionCtor();

      if (!SpeechRecognition) {
        setError("Dettatura non supportata da questo browser.");
        return;
      }

      try {
        recognitionRef.current?.abort();

        const recognition: SpeechRecognitionLike = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let finalText = "";

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i]?.[0]?.transcript || "";
            if (event.results[i]?.isFinal) {
              finalText += transcript;
            }
          }

          if (finalText.trim()) {
            onText(finalText.trim());
          }
        };

        recognition.onerror = (event: any) => {
          setError(event?.error ? `Errore microfono: ${event.error}` : "Errore microfono.");
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        setError(null);
        setIsListening(true);
        recognition.start();
      } catch (err) {
        setError("Impossibile avviare la dettatura.");
        setIsListening(false);
      }
    },
    [lang]
  );

  return {
    supported,
    isListening,
    error,
    start,
    stop,
  };
}
