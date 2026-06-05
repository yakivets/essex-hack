import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NegotiatePanel } from "./NegotiatePanel";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  data: AnalysisResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NegotiateModal({ data, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto scroll-thin bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            Draft a negotiation email
          </DialogTitle>
          <DialogDescription>
            Built from the red flags and suggested fixes. Adjust the tone, pick the points, then
            copy or download.
          </DialogDescription>
        </DialogHeader>
        <NegotiatePanel data={data} />
      </DialogContent>
    </Dialog>
  );
}
