import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Sections } from "./Sections";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  data: AnalysisResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailsDrawer({ data, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[640px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-5 py-4 border-b border-border text-left">
          <SheetTitle className="font-display text-lg">Contract details</SheetTitle>
          <SheetDescription className="text-xs">
            Obligations, money, key dates, exit terms and scenarios.
          </SheetDescription>
        </SheetHeader>
        <div className="scroll-thin flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <Sections data={data} />
          {data.benchmark_summary && (
            <div className="px-4 py-3 rounded-xl border border-border bg-card text-sm text-muted-foreground flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {data.benchmark_summary}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
