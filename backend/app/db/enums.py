"""Domain enumerations."""

import enum


class UserRole(str, enum.Enum):
    """Internal handler roles. The whistleblower is NOT a user (no role)."""

    admin = "admin"
    recipient = "recipient"
    custodian = "custodian"
    analyst = "analyst"


class CommentVisibility(str, enum.Enum):
    """Visibility of a message in a case thread.

    public   -> also visible to the whistleblower (return channel)
    internal -> internal note between handlers
    personal -> private note of the author
    """

    public = "public"
    internal = "internal"
    personal = "personal"


class IARStatus(str, enum.Enum):
    """Status of an identity-access request (delayed identity disclosure)."""

    pending = "pending"
    granted = "granted"
    denied = "denied"


class AuthorKind(str, enum.Enum):
    """Origin of a message or attachment."""

    whistleblower = "whistleblower"
    recipient = "recipient"
