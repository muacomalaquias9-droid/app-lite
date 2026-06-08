import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import person1 from "@/assets/landing-person-1.png";
import person2 from "@/assets/landing-person-2.png";
import person3 from "@/assets/landing-person-3.png";

const slides = [person1, person2, person3];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!loading && user) navigate("/feed", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-sky-50 via-white to-sky-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 overflow-hidden">
      {/* Soft blue glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />

      {/* Hero image stage */}
      <div className="relative flex-1 flex items-end justify-center pt-10">
        <div className="relative w-full max-w-md h-full flex items-end justify-center">
          {slides.map((src, i) => (
            <img
              key={src}
              src={src}
              alt="Paji"
              className={`absolute bottom-0 max-h-[70vh] object-contain transition-all duration-700 ease-out drop-shadow-2xl ${
                i === index ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Glass card */}
      <div className="relative mx-4 mb-6 rounded-[32px] p-7 bg-white/70 dark:bg-white/10 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl">
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-blue-600" : "w-1.5 bg-blue-600/30"
              }`}
            />
          ))}
        </div>

        <h1 className="text-center text-[28px] leading-[1.15] font-extrabold tracking-tight text-slate-900 dark:text-white">
          PAJI
        </h1>
        <p className="text-center mt-2 text-[15px] font-medium text-slate-700 dark:text-slate-200">
          A sua versão é o público na tua mão.
        </p>

        <Button
          onClick={() => navigate("/auth")}
          className="mt-6 w-full h-14 rounded-2xl text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-[0.98] transition"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
