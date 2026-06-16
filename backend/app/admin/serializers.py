"""Shared serializers (used by admin and public APIs)."""

from app.db.models import AppUser, Context, Questionnaire


def serialize_questionnaire(q: Questionnaire) -> dict:
    return {
        "id": str(q.id),
        "name": q.name,
        "steps": [
            {
                "id": str(step.id),
                "label": step.label,
                "description": step.description,
                "order": step.order,
                "fields": [
                    {
                        "id": str(field.id),
                        "label": field.label,
                        "hint": field.hint,
                        "type": field.type,
                        "required": field.required,
                        "order": field.order,
                        "options": [
                            {"id": str(o.id), "label": o.label, "order": o.order, "score": o.score}
                            for o in field.options
                        ],
                    }
                    for field in step.fields
                ],
            }
            for step in q.steps
        ],
    }


def serialize_context(ctx: Context, recipient_ids: list[str]) -> dict:
    return {
        "id": str(ctx.id),
        "name": ctx.name,
        "description": ctx.description,
        "questionnaire_id": str(ctx.questionnaire_id) if ctx.questionnaire_id else None,
        "tip_ttl_days": ctx.tip_ttl_days,
        "score_threshold_medium": ctx.score_threshold_medium,
        "score_threshold_high": ctx.score_threshold_high,
        "hidden": ctx.hidden,
        "order": ctx.order,
        "recipient_ids": recipient_ids,
    }


def serialize_user(u: AppUser) -> dict:
    return {
        "id": str(u.id),
        "username": u.username,
        "role": u.role.value,
        "name": u.name,
        "public_name": u.public_name,
        "mail_address": u.mail_address,
        "enabled": u.enabled,
        "two_factor_enabled": bool(u.two_factor_secret),
        "permissions": {
            "can_delete_submission": u.can_delete_submission,
            "can_postpone_expiration": u.can_postpone_expiration,
            "can_grant_access_to_reports": u.can_grant_access_to_reports,
            "can_redact_information": u.can_redact_information,
            "can_mask_information": u.can_mask_information,
            "can_reopen_reports": u.can_reopen_reports,
            "can_edit_general_settings": u.can_edit_general_settings,
        },
    }
