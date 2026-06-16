import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export function Landing() {
  const { t } = useI18n();
  return (
    <>
      <h1>{t("landing_h1")}</h1>
      <p className="lead">{t("landing_lead")}</p>

      <div className="notice">
        <strong>{t("before_start")}</strong>
        <ul>
          <li>{t("bullet_device")}</li>
          <li>{t("bullet_anon")}</li>
          <li>
            {t("bullet_receipt_pre")}
            <strong>{t("bullet_receipt_strong")}</strong>
            {t("bullet_receipt_post")}
          </li>
        </ul>
      </div>

      <div className="btn-row">
        <Link className="btn btn-primary" to="/segnala">
          {t("cta_submit")}
        </Link>
        <Link className="btn btn-secondary" to="/controlla">
          {t("cta_check")}
        </Link>
      </div>

      <h2>{t("how_title")}</h2>
      <p>{t("how_text")}</p>
    </>
  );
}
