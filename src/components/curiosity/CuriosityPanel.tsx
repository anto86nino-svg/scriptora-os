import { useEffect, useState } from "react";

const FALLBACK = [
  "Stephen King scriveva ogni giorno, anche quando non ne aveva voglia.",
  "Hemingway si fermava sempre prima di sapere come finire la scena.",
  "Il 70% dei bestseller nasce da idee semplici.",
  "I lettori decidono se continuare un libro nei primi 30 secondi.",
  "Le storie più forti nascono da conflitti emotivi.",
];

export default function CuriosityPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<string[]>(FALLBACK);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [items]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xl">
      <div className="relative max-w-xl w-full p-8 rounded-2xl bg-white/5 border border-white/10 shadow-2xl text-center">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          X
        </button>

        <h2 className="text-lg mb-6 text-white/70 tracking-wide">
          Curiosita mentre il tuo libro prende vita
        </h2>

        <div className="text-2xl font-medium text-white leading-relaxed transition-all duration-700">
          {items[index]}
        </div>

        <div className="mt-6 text-sm text-white/40">
          Nuove curiosita ogni pochi secondi
        </div>

      </div>
    </div>
  );
}
