"""
Centralized permission policy layer.
Every permission-sensitive endpoint calls require_permission() instead of 
implementing its own ad-hoc role check.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, auth, database

# Role hierarchy — higher index = more privileged
ROLE_HIERARCHY = ["read_only", "member", "billing_only", "admin", "owner"]

# Permission matrix: maps action → minimum required role
PERMISSION_MATRIX = {
    # Repository management
    "repo:view":          "read_only",
    "repo:index":         "member",
    "repo:delete":        "admin",

    # Automation rules
    "automation:view":    "read_only",
    "automation:edit":    "member",
    "automation:delete":  "admin",

    # GitHub destructive actions (from Part 3)
    "github:merge_pr":    "member",
    "github:delete_branch": "admin",
    "github:post_review": "member",

    # Billing
    "billing:view":       "billing_only",
    "billing:modify":     "owner",

    # Team management
    "team:view":          "read_only",
    "team:invite":        "admin",
    "team:change_role":   "owner",
    "team:remove":        "admin",

    # Integrations
    "integration:view":   "read_only",
    "integration:configure": "admin",
    "integration:delete": "admin",

    # Audit logs
    "audit:view":         "admin",
    "audit:export":       "owner",

    # Deployments
    "deploy:view":        "read_only",
    "deploy:trigger":     "member",
    "deploy:configure":   "admin",
}


def get_member_role(org_id: str, user_id: str, db: Session) -> str | None:
    """Return the role of a user in an organization, or None if not a member."""
    member = db.query(models.OrgMember).filter(
        models.OrgMember.organization_id == org_id,
        models.OrgMember.user_id == user_id
    ).first()
    return member.role if member else None


def has_permission(role: str, action: str) -> bool:
    """Return True if the given role satisfies the permission requirement."""
    required = PERMISSION_MATRIX.get(action)
    if required is None:
        return False  # Unknown action → deny by default
    try:
        return ROLE_HIERARCHY.index(role) >= ROLE_HIERARCHY.index(required)
    except ValueError:
        return False


def require_permission(org_id: str, action: str, db: Session, current_user: models.User):
    """
    Enforce a permission check. Raises 403 if the current user does not
    hold the required role in the given organization.
    """
    role = get_member_role(org_id, current_user.id, db)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization."
        )
    if not has_permission(role, action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your role '{role}' does not have permission for '{action}'."
        )
    return role


def write_audit_log(db: Session, org_id: str, user_id: str, action: str, detail: str = ""):
    """
    Persist an immutable audit entry for permission-sensitive actions.
    """
    import datetime
    entry = models.AuditLog(
        organization_id=org_id,
        user_id=user_id,
        action=action,
        detail=detail,
        created_at=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
