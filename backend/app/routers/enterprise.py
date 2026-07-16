"""
Enterprise router — Organizations, Teams, Billing, Deployments, Slack Integration.
All permission-sensitive actions are enforced through the centralized permissions service.
"""
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from .. import models, auth, database
from ..services.permissions import require_permission, write_audit_log
from ..services.integrations_gateway import (
    get_deployment_provider, send_slack_notification
)

router = APIRouter(prefix="/enterprise", tags=["Enterprise"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class CreateOrgRequest(BaseModel):
    name: str

class InviteMemberRequest(BaseModel):
    org_id: str
    user_id: str  # in a real flow this would be email + invitation token
    role: str = "member"

class ChangeRoleRequest(BaseModel):
    org_id: str
    target_user_id: str
    new_role: str

class ConnectProviderRequest(BaseModel):
    org_id: str
    provider_type: str  # vercel, render, aws, docker
    credentials: dict   # provider-specific keys (token, project_id, etc.)

class TriggerDeployRequest(BaseModel):
    provider_id: str
    repository_id: str
    environment: str
    commit_sha: Optional[str] = None

class ConnectSlackRequest(BaseModel):
    org_id: str
    webhook_url: str
    channel: Optional[str] = None

class BillingPlanRequest(BaseModel):
    org_id: str
    plan: str  # free, pro, enterprise


# ── Organizations ──────────────────────────────────────────────────────────────

@router.post("/organizations")
def create_organization(
    req: CreateOrgRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Create a new enterprise organization and make the creator the Owner."""
    existing = db.query(models.EnterpriseOrganization).filter(
        models.EnterpriseOrganization.name == req.name
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Organization name already taken.")

    org = models.EnterpriseOrganization(name=req.name)
    db.add(org)
    db.flush()

    # Creator becomes Owner
    member = models.OrgMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(member)

    # Auto-provision free subscription
    sub = models.Subscription(organization_id=org.id, plan="free", status="active")
    db.add(sub)

    db.commit()
    write_audit_log(db, org.id, current_user.id, "org:create", f"Created org '{req.name}'")
    return {"id": org.id, "name": org.name, "role": "owner", "plan": "free"}


@router.get("/organizations")
def list_my_organizations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Return all organizations the current user belongs to."""
    memberships = db.query(models.OrgMember).filter(
        models.OrgMember.user_id == current_user.id
    ).all()
    result = []
    for m in memberships:
        org = db.query(models.EnterpriseOrganization).get(m.organization_id)
        if org:
            sub = db.query(models.Subscription).filter(
                models.Subscription.organization_id == org.id
            ).first()
            result.append({
                "id": org.id,
                "name": org.name,
                "role": m.role,
                "plan": sub.plan if sub else "free",
                "created_at": org.created_at.isoformat()
            })
    return result


# ── Team Management ────────────────────────────────────────────────────────────

@router.post("/team/invite")
def invite_member(
    req: InviteMemberRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(req.org_id, "team:invite", db, current_user)
    existing = db.query(models.OrgMember).filter(
        models.OrgMember.organization_id == req.org_id,
        models.OrgMember.user_id == req.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member.")

    member = models.OrgMember(
        organization_id=req.org_id,
        user_id=req.user_id,
        role=req.role
    )
    db.add(member)
    db.commit()
    write_audit_log(db, req.org_id, current_user.id, "team:invite",
                    f"Invited user {req.user_id} with role '{req.role}'")
    return {"detail": "Member added.", "role": req.role}


@router.patch("/team/role")
def change_member_role(
    req: ChangeRoleRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(req.org_id, "team:change_role", db, current_user)
    member = db.query(models.OrgMember).filter(
        models.OrgMember.organization_id == req.org_id,
        models.OrgMember.user_id == req.target_user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    old_role = member.role
    member.role = req.new_role
    db.commit()
    write_audit_log(db, req.org_id, current_user.id, "team:change_role",
                    f"Changed user {req.target_user_id} from '{old_role}' to '{req.new_role}'")
    return {"detail": "Role updated.", "new_role": req.new_role}


@router.get("/team/{org_id}/members")
def list_members(
    org_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "team:view", db, current_user)
    members = db.query(models.OrgMember).filter(
        models.OrgMember.organization_id == org_id
    ).all()
    result = []
    for m in members:
        user = db.query(models.User).get(m.user_id)
        result.append({
            "user_id": m.user_id,
            "email": user.email if user else None,
            "role": m.role,
            "joined_at": m.created_at.isoformat()
        })
    return result


# ── Billing ────────────────────────────────────────────────────────────────────

@router.get("/billing/{org_id}")
def get_billing_status(
    org_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "billing:view", db, current_user)
    sub = db.query(models.Subscription).filter(
        models.Subscription.organization_id == org_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found.")
    return {
        "plan": sub.plan,
        "status": sub.status,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "stripe_customer_id": sub.stripe_customer_id,
    }


@router.patch("/billing/plan")
def change_plan(
    req: BillingPlanRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(req.org_id, "billing:modify", db, current_user)
    sub = db.query(models.Subscription).filter(
        models.Subscription.organization_id == req.org_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found.")
    old_plan = sub.plan
    sub.plan = req.plan
    db.commit()
    write_audit_log(db, req.org_id, current_user.id, "billing:modify",
                    f"Changed plan from '{old_plan}' to '{req.plan}'")
    return {"detail": "Plan updated.", "plan": sub.plan}


# ── Deployment Providers ───────────────────────────────────────────────────────

@router.post("/deployments/providers")
def connect_provider(
    req: ConnectProviderRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(req.org_id, "deploy:configure", db, current_user)
    provider = models.DeploymentProvider(
        organization_id=req.org_id,
        provider_type=req.provider_type,
        credentials=json.dumps(req.credentials)
    )
    db.add(provider)
    db.commit()
    write_audit_log(db, req.org_id, current_user.id, "deploy:configure",
                    f"Connected provider '{req.provider_type}'")
    return {"id": provider.id, "provider_type": provider.provider_type}


@router.get("/deployments/providers/{org_id}")
def list_providers(
    org_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "deploy:view", db, current_user)
    providers = db.query(models.DeploymentProvider).filter(
        models.DeploymentProvider.organization_id == org_id
    ).all()
    return [{"id": p.id, "provider_type": p.provider_type, "created_at": p.created_at.isoformat()}
            for p in providers]


@router.post("/deployments/trigger")
async def trigger_deployment(
    req: TriggerDeployRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    provider_record = db.query(models.DeploymentProvider).get(req.provider_id)
    if not provider_record:
        raise HTTPException(status_code=404, detail="Deployment provider not found.")

    require_permission(provider_record.organization_id, "deploy:trigger", db, current_user)

    adapter = get_deployment_provider(provider_record.provider_type, provider_record.credentials)
    result = await adapter.trigger_deploy(req.environment, req.commit_sha)

    # Persist deployment record
    deployment = models.Deployment(
        provider_id=req.provider_id,
        repository_id=req.repository_id,
        environment=req.environment,
        status=result.get("status", "building"),
        commit_sha=req.commit_sha,
    )
    db.add(deployment)
    db.commit()
    return {**result, "deployment_db_id": deployment.id}


@router.get("/deployments/{org_id}/status/{environment}")
async def get_deployment_status(
    org_id: str,
    environment: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "deploy:view", db, current_user)
    # Get the first configured provider for this org
    provider_record = db.query(models.DeploymentProvider).filter(
        models.DeploymentProvider.organization_id == org_id
    ).first()
    if not provider_record:
        return {"status": "no_provider", "message": "No deployment provider configured."}

    adapter = get_deployment_provider(provider_record.provider_type, provider_record.credentials)
    return await adapter.get_status(environment)


# ── Slack Integration ──────────────────────────────────────────────────────────

@router.post("/integrations/slack")
def connect_slack(
    req: ConnectSlackRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(req.org_id, "integration:configure", db, current_user)
    integration = models.SlackIntegration(
        organization_id=req.org_id,
        webhook_url=req.webhook_url,
        channel=req.channel
    )
    db.add(integration)
    db.commit()
    write_audit_log(db, req.org_id, current_user.id, "integration:configure",
                    f"Connected Slack channel '{req.channel}'")
    return {"id": integration.id, "channel": integration.channel}


@router.get("/integrations/slack/{org_id}")
def get_slack_status(
    org_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "integration:view", db, current_user)
    integration = db.query(models.SlackIntegration).filter(
        models.SlackIntegration.organization_id == org_id,
        models.SlackIntegration.is_enabled == True
    ).first()
    if not integration:
        return {"connected": False}
    return {"connected": True, "channel": integration.channel, "id": integration.id}


@router.post("/integrations/slack/test")
async def test_slack_notification(
    org_id: str = Body(..., embed=True),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "integration:configure", db, current_user)
    integration = db.query(models.SlackIntegration).filter(
        models.SlackIntegration.organization_id == org_id,
        models.SlackIntegration.is_enabled == True
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Slack not connected.")
    await send_slack_notification(
        integration.webhook_url,
        "✅ Tony AI Slack integration is working!",
        integration.channel
    )
    return {"detail": "Test notification sent."}


# ── Audit Logs ─────────────────────────────────────────────────────────────────

@router.get("/audit/{org_id}")
def get_audit_logs(
    org_id: str,
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    require_permission(org_id, "audit:view", db, current_user)
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.organization_id == org_id
    ).order_by(models.AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "detail": l.detail,
            "user_id": l.user_id,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]
