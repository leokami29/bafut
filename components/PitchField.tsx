"use client";

import { PitchFieldDynamic } from "@/components/PitchFieldDynamic";
import { usePitchSetup } from "@/hooks/use-pitch-setup";

type PitchFieldProps = {
  className?: string;
};

export function PitchField({ className }: PitchFieldProps) {
  const pitch = usePitchSetup({ rotate: false });
  return (
    <PitchFieldDynamic
      className={className}
      setup={pitch.setup}
      dots={pitch.dots}
      mounted={pitch.mounted}
    />
  );
}
