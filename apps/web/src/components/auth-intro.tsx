import { ArrowDownRight, Check } from "lucide-react";

export function AuthIntro() {
  return (
    <aside className="auth-note">
      <div>
        <p className="eyebrow">A quieter way to get things done</p>
        <h2 className="mt-7 max-w-md text-5xl font-medium leading-[1.08] tracking-[-0.055em]">
          A good script
          <br />
          deserves a<br />
          <span className="text-muted-foreground">steady rhythm.</span>
        </h2>
        <p className="mt-6 max-w-xs text-sm leading-7 text-muted-foreground">
          Keep the little jobs moving. Schedule trusted code, manage its
          secrets, and see what happened after every run.
        </p>
      </div>
      <div className="mt-12 max-w-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="eyebrow">From script to routine</span>
          <ArrowDownRight className="h-4 w-4 text-primary" />
        </div>
        {[
          "Your code, in your preferred runtime",
          "Cron schedules with a timezone",
          "Run history with captured output",
        ].map((text, index) => (
          <div key={text} className="flex items-center gap-4 border-b py-4">
            <span className="font-mono text-[10px] text-muted-foreground">
              0{index + 1}
            </span>
            <p className="flex-1 text-xs">{text}</p>
            <Check className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ))}
        <p className="mt-5 font-mono text-[10px] leading-5 text-muted-foreground">
          Personal workspace. Trusted code only.
          <br />
          Execution requires approval and an isolated worker.
        </p>
      </div>
    </aside>
  );
}
