"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SearchSelect, type Option } from "@/components/ui/search-select";
import { api } from "@/lib/api";

/** Dropdown of registered transport companies, for drivers choosing who they work for. */
export function CompanySelect({ value, onChange, invalid }: { value: Option | null; onChange: (option: Option) => void; invalid?: boolean }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ companies: { id: string; name: string; ownerName: string }[] }>("/api/companies")
      // "Owner name - Company name", so drivers can tell similar companies apart.
      .then((res) => setOptions(res.companies.map((c) => ({ value: c.id, label: c.ownerName ? `${c.ownerName} - ${c.name}` : c.name }))))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SearchSelect
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      title="Your company"
      placeholder="Choose your company"
      searchPlaceholder="Search companies"
      emptyText="No company found. Ask your owner for the exact company name they registered."
      invalid={invalid}
      icon={<Building2 className="h-4 w-4" />}
    />
  );
}
