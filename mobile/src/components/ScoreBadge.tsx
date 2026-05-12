import type { Decision } from "../types";

const STYLES: Record<Decision, string> = {
  safe: "bg-emerald-100 text-emerald-800 border-emerald-200",
  review: "bg-amber-100 text-amber-800 border-amber-200",
  sms: "bg-orange-100 text-orange-800 border-orange-200",
  biometry: "bg-red-100 text-red-800 border-red-200",
};

interface Props {
  score: number;
  decision: Decision;
  reasons?: string[];
}

export default function ScoreBadge({ score, decision, reasons }: Props) {
  return (
    <div className={`inline-flex flex-col gap-1 border rounded-lg px-3 py-2 text-xs ${STYLES[decision]}`}>
      <div className="flex items-center gap-2">
        <span className="font-semibold">Антифрод</span>
        <span>score = {score.toFixed(1)}</span>
        <span className="uppercase">{decision}</span>
      </div>
      {reasons && reasons.length > 0 && (
        <ul className="list-disc list-inside opacity-80">
          {reasons.slice(0, 6).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
