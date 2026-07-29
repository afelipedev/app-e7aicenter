import { motion, useReducedMotion } from "framer-motion";
import { Bot } from "lucide-react";

// Indicador "pensando": avatar com anel pulsante + verbos que ciclam.
// Respeita prefers-reduced-motion.
const VERBOS = ["Analisando", "Consultando", "Raciocinando", "Redigindo"];

export function PensandoIndicador({ nome }: { nome?: string }) {
  const reduzir = useReducedMotion();
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="relative w-8 h-8 shrink-0">
        {!reduzir && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {reduzir ? (
          <span>{nome ? `${nome} está respondendo…` : "Respondendo…"}</span>
        ) : (
          <div className="relative h-5 overflow-hidden">
            <motion.div
              animate={{ y: ["0%", "-25%", "-50%", "-75%", "0%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
              className="flex flex-col"
            >
              {[...VERBOS, VERBOS[0]].map((v, i) => (
                <span key={i} className="h-5 leading-5">{v}…</span>
              ))}
            </motion.div>
          </div>
        )}
        {!reduzir && (
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}
