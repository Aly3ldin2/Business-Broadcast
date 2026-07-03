import { useState, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, countryFlag, findCountry, type Country } from "@/data/countries";
import { useI18n } from "@/lib/i18n";

interface CountryPickerProps {
  value: string;
  onChange: (country: Country) => void;
}

export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { t } = useI18n();

  const selected = findCountry(value);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso2.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium shrink-0 h-10"
        >
          <span className="text-lg leading-none">{countryFlag(selected.iso2)}</span>
          <span className="text-muted-foreground">{selected.dialCode}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start" side="bottom">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("country_search")}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* List */}
        <div className="max-h-60 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("country_no_results")}</p>
          ) : (
            filtered.map((country) => (
              <button
                key={country.iso2 + country.dialCode}
                type="button"
                onClick={() => { onChange(country); setOpen(false); setSearch(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-right ${
                  selected.iso2 === country.iso2 && selected.dialCode === country.dialCode
                    ? "bg-primary/5 text-primary"
                    : ""
                }`}
              >
                <span className="text-xl leading-none w-7 text-center shrink-0">
                  {countryFlag(country.iso2)}
                </span>
                <span className="flex-1 text-right truncate">{country.name}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0 dir-ltr">
                  {country.dialCode}
                </span>
                {selected.iso2 === country.iso2 && selected.dialCode === country.dialCode && (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
