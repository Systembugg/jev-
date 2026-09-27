import Link from "next/link";
import StudioClient from "@/components/studio/StudioClient";

export const metadata = {
  title: "Schema Studio — plain English → Jev payloads",
};

export default function StudioPage() {
  return (
    <main className="stage" style={{ paddingTop: 48 }}>
      <div className="brand">
        <Link href="/" className="link" style={{ color: "inherit", textDecoration: "none" }}>
          jev<span>/</span>play
        </Link>{" "}
        · schema studio
      </div>
      <p className="hint" style={{ marginTop: 0, marginBottom: 28 }}>
        Regular people describe a decision in English. The studio turns it into the
        typed question schema Jev understands — task packs first, a small local model
        when needed. <Link href="/" className="link">← back to the morphing input</Link>
      </p>
      <StudioClient />
    </main>
  );
}
