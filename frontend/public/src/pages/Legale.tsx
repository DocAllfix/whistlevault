import { LegalPage } from "../components/LegalPage";
import { legal } from "../content/legal";
import { useI18n } from "../i18n";

export function Legale() {
  const { lang } = useI18n();
  return <LegalPage doc={legal[lang]} />;
}
