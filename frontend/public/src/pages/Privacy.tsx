import { LegalPage } from "../components/LegalPage";
import { privacy } from "../content/legal";
import { useI18n } from "../i18n";

export function Privacy() {
  const { lang } = useI18n();
  return <LegalPage doc={privacy[lang]} />;
}
