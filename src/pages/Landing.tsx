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
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {/* Hero image stage */}
      <div className="relative flex-1 flex items-end justify-center bg-gradient-to-b from-sky-100 via-sky-50 to-white dark:from-blue-950 dark:via-slate-900 dark:to-slate-950">
        <div className="relative w-full max-w-md h-full flex items-end justify-center">
          {slides.map((src, i) => (
            <img
              key={src}
              src={src}
              alt="Paji"
              className={`absolute bottom-0 max-h-[78vh] object-contain transition-opacity duration-700 ease-out ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Solid bottom card */}
      <div className="relative px-6 pt-6 pb-8 bg-white dark:bg-slate-950 border-t border-border">
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

        <h1 className="text-center text-[30px] leading-[1.1] font-extrabold tracking-tight text-slate-900 dark:text-white">
          PAJI
        </h1>
        <p className="text-center mt-2 text-[15px] font-medium text-slate-600 dark:text-slate-300">
          A sua versão é o público na tua mão.
        </p>

        <Button
          onClick={() => navigate("/auth")}
          className="mt-6 w-full h-14 rounded-2xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-[0.98] transition"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
