// Footer: the data version and the rule version, so every page says which release it shows.
// The rule version comes from data/rules/version.json; the data version is a prop until lib/data exposes a reader.
import rules from "@/data/rules/version.json";

export interface FooterProps {
  dataVersion?: string;
  ruleVersion?: string;
}

export function Footer({ dataVersion, ruleVersion = rules.version }: FooterProps) {
  return (
    <footer className="src" style={{ marginTop: 56 }}>
      {dataVersion ? <span>Data {dataVersion}</span> : null}
      {dataVersion ? " · " : null}
      <span>Rules {ruleVersion}</span>
    </footer>
  );
}
