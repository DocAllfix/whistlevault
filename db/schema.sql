-- =============================================================================
-- WhistleBlower Platform — Schema DB (PostgreSQL)
-- =============================================================================
-- Modello dati proprietario per la piattaforma di whistleblowing.
-- Progettato a partire dai requisiti normativi (Direttiva UE 2019/1937,
-- D.lgs. 24/2023, GDPR, ISO 37002) e dalle best practice di settore.
--
-- Principi di dominio incorporati (CLAUDE.md §5):
--   * Minimizzazione dati: NESSUNA colonna IP / user-agent / device fingerprint.
--     (cfr. caso Bologna Airport — logging invasivo = violazione privacy by design)
--   * Anonimato: il whistleblower NON ha account né email; rientra con un "receipt".
--   * Crittografia at-rest: i campi marcati [ENC] sono cifrati a livello applicativo
--     (PyNaCl/libsodium) con la chiave del report; il DB non vede il chiaro.
--   * Retention: ogni report ha expiration_date; il canale (context) definisce il TTL.
--   * RBAC: ruoli + permessi granulari sulla tabella app_user.
--   * Multi-tenant ready: tenant_id ovunque. Single-tenant = un solo tenant (id=1).
--   * Audit: solo eventi/azioni dei gestori, MAI contenuto o PII del segnalante.
--
-- Dialetto: PostgreSQL 13+ (gen_random_uuid via pgcrypto).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Enum
-- -----------------------------------------------------------------------------
-- Ruoli interni (gestori). Il whistleblower NON è un utente: nessun ruolo.
CREATE TYPE user_role AS ENUM ('admin', 'recipient', 'custodian', 'analyst');

-- Visibilità di un messaggio nel thread del caso.
--   public   = visibile anche al whistleblower (canale di ritorno)
--   internal = nota interna tra gestori
--   personal = nota privata dell'autore
CREATE TYPE comment_visibility AS ENUM ('public', 'internal', 'personal');

-- Stato di una richiesta di accesso all'identità (delayed identity disclosure).
CREATE TYPE iar_status AS ENUM ('pending', 'granted', 'denied');

-- Origine di un file/allegato o di un messaggio.
CREATE TYPE author_kind AS ENUM ('whistleblower', 'recipient');

-- =============================================================================
-- TENANT  — un'organizzazione. Single-tenant: esiste solo id=1.
-- =============================================================================
CREATE TABLE tenant (
    id          SERIAL PRIMARY KEY,
    label       TEXT NOT NULL DEFAULT '',      -- nome organizzazione (uso interno)
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- APP_USER  — gestori interni (admin / recipient / custodian / analyst).
-- I campi crypto_* abilitano il modello a chiavi: ogni utente ha una coppia di
-- chiavi; la privata è cifrata con una chiave derivata dalla password.
-- =============================================================================
CREATE TABLE app_user (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    username                 TEXT NOT NULL,
    salt                     TEXT NOT NULL DEFAULT '',
    password_hash            TEXT NOT NULL DEFAULT '',
    role                     user_role NOT NULL DEFAULT 'recipient',
    enabled                  BOOLEAN NOT NULL DEFAULT TRUE,

    name                     TEXT NOT NULL DEFAULT '',   -- nome reale (interno)
    public_name              TEXT NOT NULL DEFAULT '',   -- nome mostrato al WB, se previsto
    mail_address             TEXT NOT NULL DEFAULT '',   -- email del GESTORE (staff), non del WB
    language                 TEXT NOT NULL DEFAULT 'it',

    last_login               TIMESTAMPTZ,
    password_change_needed   BOOLEAN NOT NULL DEFAULT TRUE,
    password_change_date     TIMESTAMPTZ,
    two_factor_secret        TEXT NOT NULL DEFAULT '',
    accepted_privacy_policy  TIMESTAMPTZ,

    -- Modello crittografico (chiavi opache: il DB non interpreta nulla)
    crypto_pub_key           TEXT NOT NULL DEFAULT '',  -- pubblica
    crypto_prv_key           TEXT NOT NULL DEFAULT '',  -- privata, cifrata con chiave da password
    crypto_rec_key           TEXT NOT NULL DEFAULT '',  -- privata cifrata con recovery key
    crypto_escrow_prv_key    TEXT NOT NULL DEFAULT '',  -- escrow per recupero amministrativo

    -- Permessi granulari (least privilege)
    can_delete_submission        BOOLEAN NOT NULL DEFAULT FALSE,
    can_postpone_expiration      BOOLEAN NOT NULL DEFAULT TRUE,
    can_grant_access_to_reports  BOOLEAN NOT NULL DEFAULT FALSE,
    can_redact_information       BOOLEAN NOT NULL DEFAULT FALSE,
    can_mask_information         BOOLEAN NOT NULL DEFAULT TRUE,
    can_reopen_reports           BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit_general_settings    BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE (tenant_id, username)
);
CREATE INDEX idx_app_user_tenant ON app_user (tenant_id);

-- =============================================================================
-- QUESTIONARI (motore dinamico lean): questionnaire -> step -> field -> option
-- Label/description sono JSONB localizzati: {"it": "...", "en": "..."}
-- =============================================================================
CREATE TABLE questionnaire (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_questionnaire_tenant ON questionnaire (tenant_id);

CREATE TABLE step (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id  UUID NOT NULL REFERENCES questionnaire(id) ON DELETE CASCADE,
    label             JSONB NOT NULL DEFAULT '{}',
    description       JSONB NOT NULL DEFAULT '{}',
    "order"           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_step_questionnaire ON step (questionnaire_id);

-- Tipi campo supportati a livello applicativo:
--   'text','textarea','bool','date','select','multiselect','file'
CREATE TABLE field (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id   UUID NOT NULL REFERENCES step(id) ON DELETE CASCADE,
    label     JSONB NOT NULL DEFAULT '{}',
    hint      JSONB NOT NULL DEFAULT '{}',
    type      TEXT NOT NULL DEFAULT 'text',
    required  BOOLEAN NOT NULL DEFAULT FALSE,
    "order"   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_field_step ON field (step_id);

CREATE TABLE field_option (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id  UUID NOT NULL REFERENCES field(id) ON DELETE CASCADE,
    label     JSONB NOT NULL DEFAULT '{}',
    "order"   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_field_option_field ON field_option (field_id);

-- =============================================================================
-- SUBMISSION_STATUS / SUBMISSION_SUBSTATUS — workflow configurabile (ISO 37002).
-- Stati di sistema seedati: new -> opened -> closed. Ogni tenant può aggiungerne.
-- =============================================================================
CREATE TABLE submission_status (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    label          JSONB NOT NULL DEFAULT '{}',
    "order"        INTEGER NOT NULL DEFAULT 0,
    system_defined BOOLEAN NOT NULL DEFAULT FALSE   -- stati lockati non eliminabili
);
CREATE INDEX idx_status_tenant ON submission_status (tenant_id);

CREATE TABLE submission_substatus (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id  UUID NOT NULL REFERENCES submission_status(id) ON DELETE CASCADE,
    label      JSONB NOT NULL DEFAULT '{}',
    "order"    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_substatus_status ON submission_substatus (status_id);

-- =============================================================================
-- CONTEXT — canale di segnalazione (es. "Anticorruzione", "Sicurezza lavoro").
-- Definisce questionario, retention (tip_ttl_days) e regole sui destinatari.
-- =============================================================================
CREATE TABLE context (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                  INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name                       JSONB NOT NULL DEFAULT '{}',
    description                JSONB NOT NULL DEFAULT '{}',
    questionnaire_id           UUID REFERENCES questionnaire(id),
    tip_ttl_days               INTEGER NOT NULL DEFAULT 90,   -- RETENTION: giorni di conservazione
    tip_reminder_days          INTEGER NOT NULL DEFAULT 0,
    allow_recipient_selection  BOOLEAN NOT NULL DEFAULT FALSE,
    select_all_recipients      BOOLEAN NOT NULL DEFAULT TRUE,
    hidden                     BOOLEAN NOT NULL DEFAULT FALSE,
    "order"                    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_context_tenant ON context (tenant_id);

-- M2M: quali gestori (recipient) ricevono le segnalazioni di un canale.
CREATE TABLE context_recipient (
    context_id    UUID NOT NULL REFERENCES context(id) ON DELETE CASCADE,
    recipient_id  UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    "order"       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (context_id, recipient_id)
);

-- =============================================================================
-- REPORT  — la segnalazione. Entità centrale del dominio.
-- Privacy: NIENTE IP / user-agent. Solo flag aggregati non identificativi.
-- =============================================================================
CREATE TABLE report (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                     INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    context_id                    UUID NOT NULL REFERENCES context(id),
    progressive                   INTEGER NOT NULL DEFAULT 0,  -- numero progressivo per-tenant (mostrato ai gestori)

    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_access                   TIMESTAMPTZ NOT NULL DEFAULT now(),

    status_id                     UUID REFERENCES submission_status(id),
    substatus_id                  UUID REFERENCES submission_substatus(id),
    label                         TEXT NOT NULL DEFAULT '',    -- etichetta assegnata dal gestore
    important                     BOOLEAN NOT NULL DEFAULT FALSE,
    score                         INTEGER NOT NULL DEFAULT 0,  -- punteggio di rischio (da questionario)

    -- Accesso anonimo del whistleblower
    receipt_hash                  TEXT NOT NULL,               -- hash del receipt a 16 cifre (mai il chiaro)
    access_count                  INTEGER NOT NULL DEFAULT 0,

    -- Identità: il WB può scegliere di rivelarsi (delayed identity disclosure)
    enable_whistleblower_identity BOOLEAN NOT NULL DEFAULT FALSE,

    -- Retention / lifecycle
    expiration_date               TIMESTAMPTZ,                 -- oltre questa data: cancellazione/anonimizzazione
    reminder_date                 TIMESTAMPTZ,

    -- Flag NON identificativi (aggregati, per statistica/UX). NIENTE IP.
    tor                           BOOLEAN NOT NULL DEFAULT FALSE,
    mobile                        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Crittografia: ogni report ha la propria coppia di chiavi.
    crypto_pub_key                TEXT NOT NULL DEFAULT '',    -- pubblica del report
    crypto_prv_key                TEXT NOT NULL DEFAULT '',    -- privata, wrappata con escrow
    crypto_tip_pub_key            TEXT NOT NULL DEFAULT '',    -- pubblica per cifrare contenuti
    crypto_tip_prv_key            TEXT NOT NULL DEFAULT '',    -- privata del tip (distribuita ai recipient)

    UNIQUE (tenant_id, progressive),
    UNIQUE (tenant_id, receipt_hash)
);
CREATE INDEX idx_report_tenant ON report (tenant_id);
CREATE INDEX idx_report_context ON report (context_id);
CREATE INDEX idx_report_status ON report (status_id);
CREATE INDEX idx_report_expiration ON report (expiration_date);  -- per job di retention

-- Risposte al questionario (cifrate). questionnaire_hash congela lo schema usato.
CREATE TABLE report_answer (
    report_id          UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    questionnaire_hash TEXT NOT NULL,
    answers            JSONB NOT NULL DEFAULT '{}',   -- [ENC] mappa field_id -> valore
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (report_id, questionnaire_hash)
);

-- =============================================================================
-- RECIPIENT_REPORT  — vista per-gestore di un report.
-- Tiene l'accountability degli accessi e la chiave del tip wrappata per quel
-- recipient (così solo i destinatari autorizzati decifrano il contenuto).
-- =============================================================================
CREATE TABLE recipient_report (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id            UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    recipient_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    access_date          TIMESTAMPTZ,
    last_access          TIMESTAMPTZ,
    new                  BOOLEAN NOT NULL DEFAULT TRUE,
    enable_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    wrapped_tip_prv_key  TEXT NOT NULL DEFAULT '',  -- crypto_tip_prv_key del report wrappata con la pubblica del recipient
    UNIQUE (report_id, recipient_id)
);
CREATE INDEX idx_recipient_report_report ON recipient_report (report_id);
CREATE INDEX idx_recipient_report_recipient ON recipient_report (recipient_id);

-- =============================================================================
-- COMMENT  — thread di comunicazione WB <-> gestori.
-- author_id NULL = messaggio del whistleblower (anonimo). Altrimenti = gestore.
-- =============================================================================
CREATE TABLE comment (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id    UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    author_id    UUID REFERENCES app_user(id) ON DELETE SET NULL,  -- NULL = whistleblower
    author_kind  author_kind NOT NULL DEFAULT 'whistleblower',
    content      TEXT NOT NULL,                       -- [ENC]
    visibility   comment_visibility NOT NULL DEFAULT 'public',
    new          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comment_report ON comment (report_id);

-- =============================================================================
-- REPORT_FILE  — allegati. Il contenuto del file è cifrato nello storage;
-- qui stanno solo i metadati. Il nome è cifrato (no filename "parlanti", no EXIF).
-- author_kind distingue file del WB da file caricati dai gestori per il WB.
-- =============================================================================
CREATE TABLE report_file (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id     UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    author_id     UUID REFERENCES app_user(id) ON DELETE SET NULL,  -- NULL = whistleblower
    author_kind   author_kind NOT NULL DEFAULT 'whistleblower',
    name          TEXT NOT NULL DEFAULT '',   -- [ENC] nome file originale
    content_type  TEXT NOT NULL DEFAULT '',
    size          BIGINT NOT NULL DEFAULT 0,
    reference_id  TEXT NOT NULL DEFAULT '',   -- puntatore all'oggetto cifrato nello storage
    visibility    comment_visibility NOT NULL DEFAULT 'public',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_file_report ON report_file (report_id);

-- =============================================================================
-- IDENTITY_ACCESS_REQUEST — delayed identity disclosure.
-- Un recipient chiede di accedere all'identità del WB; uno o più custodian
-- approvano/rifiutano. Solo se approvato la chiave viene sbloccata.
-- =============================================================================
CREATE TABLE identity_access_request (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id         UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    request_user_id   UUID NOT NULL REFERENCES app_user(id),
    request_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_motivation TEXT NOT NULL DEFAULT '',
    status            iar_status NOT NULL DEFAULT 'pending',
    reply_user_id     UUID REFERENCES app_user(id),
    reply_date        TIMESTAMPTZ,
    reply_motivation  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_iar_report ON identity_access_request (report_id);

CREATE TABLE identity_access_request_custodian (
    iar_id              UUID NOT NULL REFERENCES identity_access_request(id) ON DELETE CASCADE,
    custodian_id        UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    wrapped_tip_prv_key TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (iar_id, custodian_id)
);

-- =============================================================================
-- REDACTION — mascheramento/oscuramento di dati sensibili in un report.
-- Permette redazione reversibile (temporary) e permanente.
-- =============================================================================
CREATE TABLE redaction (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id           UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
    reference_id        TEXT NOT NULL DEFAULT '',   -- a quale oggetto/campo si applica
    entry               TEXT NOT NULL DEFAULT '0',
    temporary_redaction JSONB NOT NULL DEFAULT '{}',
    permanent_redaction JSONB NOT NULL DEFAULT '{}',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_redaction_report ON redaction (report_id);

-- =============================================================================
-- AUDIT_LOG — accountability degli accessi/azioni dei GESTORI.
-- VINCOLO PRIVACY: qui NON vanno IP, user-agent, né contenuto/PII del segnalante.
-- Solo: chi (user_id), cosa (type), su quale oggetto (object_id), quando, metadati.
-- =============================================================================
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    type        TEXT NOT NULL DEFAULT '',   -- codice evento (es. 'report_access', 'status_change')
    user_id     UUID REFERENCES app_user(id) ON DELETE SET NULL,
    object_id   UUID,
    data        JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_audit_tenant_date ON audit_log (tenant_id, occurred_at);
