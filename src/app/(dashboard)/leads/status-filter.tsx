"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { LEAD_STATUS_LABELS } from "@/lib/utils";

export function StatusFilter({ current }: { current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("status", e.target.value);
    } else {
      params.delete("status");
    }
    router.push(`/leads${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <Select className="w-48" value={current ?? ""} onChange={onChange}>
      <option value="">All statuses</option>
      {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}
