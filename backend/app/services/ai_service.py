import os
import json
import time
import logging
from pathlib import Path
from google import genai
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _build_prompt(
    application: str,
    error_message: str,
    description: str,
    severity: str,
    devops_tool: str | None = None,
    environment: str | None = None,
    service_or_cluster: str | None = None,
    similar_incidents: list[dict] | None = None,
) -> str:
    """Build DevOps SRE RAG-enhanced prompt."""

    # Build historical context block if we have past similar incidents
    history_block = ""
    if similar_incidents:
        lines = []
        for i, inc in enumerate(similar_incidents, 1):
            lines.append(
                f"  Past Incident {i} (Similarity: {inc['similarity_score']}% | App: {inc['application']}):\n"
                f"    Error: {inc['error']}\n"
                f"    Root Cause: {inc.get('root_cause', 'N/A')}\n"
                f"    Fix Applied: {inc.get('suggested_solution', 'N/A')}\n"
                f"    CLI Commands Used: {inc.get('ai_remediation_commands', 'N/A')}\n"
                f"    Prevention: {inc.get('preventive_action', 'N/A')}"
            )
        history_block = (
            "\n  INTERNAL COMPANY HISTORY — Similar resolved incidents from this organization:\n"
            + "\n".join(lines)
            + "\n\n  Use the above internal history to provide a more accurate and organization-specific remediation.\n"
        )

    devops_context = ""
    if devops_tool or environment or service_or_cluster:
        devops_context = f"""
    DevOps Infrastructure Context:
    - Primary Technology/Tool: {devops_tool or 'Auto-detect (Kubernetes/Docker/AWS/CI-CD/Terraform/Prometheus/NGINX)'}
    - Environment: {environment or 'Production'}
    - Cluster / Service / Target: {service_or_cluster or 'Default namespace / cluster'}
    """

    prompt = f"""
    You are a Principal Site Reliability Engineer (SRE), Cloud Infrastructure Architect, and DevOps Incident Commander.
    You specialize across the entire DevOps lifecycle:
    - Kubernetes & Containers (CrashLoopBackOff, OOMKilled, Evicted, CNI, Ingress, Helm, K8s RBAC)
    - Cloud Infrastructure & IaC (AWS ECS/EKS/RDS, Terraform drift/state locks, Ansible)
    - CI/CD Pipelines (GitHub Actions, GitLab CI, Jenkins, ArgoCD rollouts)
    - Observability & Metrics (Prometheus alerting, Grafana, Datadog, ELK stack, CPU/Memory spikes)
    - Networking & Gateways (NGINX 502/504 Bad Gateway, Envoy, SSL/TLS expiry, DNS resolution)
    - Databases & Queues (PostgreSQL connection exhaustion, Redis OOM, Kafka consumer lag)

    Analyze the following DevOps incident:

    Application: {application}
    Error Telemetry: {error_message}
    Description / Symptoms: {description}
    Reported Severity: {severity}
    {devops_context}
    {history_block}
    Based on the incident telemetry{' and internal history above' if similar_incidents else ''}:
    1. Determine the root cause with deep technical accuracy.
    2. Provide practical, copy-pasteable CLI remediation commands (e.g. `kubectl`, `docker`, `aws`, `terraform`, `git`, or shell commands with comments).
    3. Provide an SRE Runbook with verification and rollback steps.

    Return ONLY valid JSON with exactly these fields:

    {{
        "root_cause": "Concise technical root cause diagnosis",
        "severity": "Low, Medium, High, or Critical",
        "explanation": "Clear explanation of what happened and why in terms of DevOps/system architecture",
        "suggested_solution": "Step-by-step technical fix",
        "remediation_commands": "# Copy-pasteable terminal commands with comments\\n# e.g.:\\nkubectl describe pod <pod_name> -n <ns>\\nkubectl logs <pod_name> --previous\\n# fix commands...",
        "runbook": "1. Immediate mitigation\\n2. Health check verification\\n3. Emergency rollback procedure",
        "preventive_action": "Long-term architectural guardrails to prevent recurrence",
        "devops_tool": "Kubernetes | Docker | AWS / Cloud | CI/CD | Terraform | Prometheus | NGINX | Database | General"
    }}
    """
    return prompt


def investigate_incident(
    application: str,
    error_message: str,
    description: str,
    severity: str,
    devops_tool: str | None = None,
    environment: str | None = None,
    service_or_cluster: str | None = None,
    similar_incidents: list[dict] | None = None,
) -> dict:
    """
    Investigate an incident using Gemini with DevOps SRE reasoning and CLI remediation command generation.
    """
    prompt = _build_prompt(
        application=application,
        error_message=error_message,
        description=description,
        severity=severity,
        devops_tool=devops_tool,
        environment=environment,
        service_or_cluster=service_or_cluster,
        similar_incidents=similar_incidents,
    )

    candidate_models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash"]
    last_err = None

    for model_name in candidate_models:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json"
                    }
                )

                result = json.loads(response.text)

                if similar_incidents:
                    logger.info(
                        "RAG investigation completed with %d historical matches using %s",
                        len(similar_incidents),
                        model_name
                    )
                else:
                    logger.info("Standard investigation completed using %s", model_name)

                return result

            except Exception as e:
                last_err = e
                logger.warning("Attempt with model %s failed: %s", model_name, e)
                time.sleep(1)

    raise last_err or RuntimeError("All AI models failed to respond")
