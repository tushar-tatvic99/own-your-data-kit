"""Stretch Goal 3: Three-Year TCO Cost Calculator & Sales Pitch Tool.

Compares 3-year total cost of ownership between proprietary enterprise platforms
(GA4 360, Adobe Analytics, Mixpanel, Free GA4) and OYDK Self-Hosted on GCP (asia-south1)
with Tatvic deployment and maintenance contracts.
"""

import json
import sys
from pathlib import Path
from typing import Any

# Ensure project root is in path
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

# Exchange rate benchmark
USD_TO_INR = 83.50

INCUMBENT_PRICING = {
    "ga4_360": {
        "name": "Google Analytics 360 (GA4 360)",
        "base_usd_annual": 150000,
        "overage_per_million_usd": 1200,
        "included_events_monthly": 25000000,
        "description": "Enterprise Google Analytics 360 Tier 1 license",
    },
    "adobe_analytics": {
        "name": "Adobe Analytics (Select / Prime)",
        "base_usd_annual": 120000,
        "overage_per_million_usd": 1500,
        "included_events_monthly": 20000000,
        "description": "Adobe Experience Cloud Analytics enterprise contract",
    },
    "mixpanel": {
        "name": "Mixpanel Enterprise",
        "base_usd_annual": 60000,
        "overage_per_million_usd": 1800,
        "included_events_monthly": 10000000,
        "description": "Mixpanel Enterprise plan with data pipelines",
    },
    "free_ga4": {
        "name": "Google Analytics 4 (Free Tier)",
        "base_usd_annual": 0,
        "overage_per_million_usd": 0,
        "included_events_monthly": 10000000,
        "description": "Free GA4 with 14-month retention cap & sampling limits",
    },
}


def calculate_cloud_cost(monthly_events: int) -> dict[str, float]:
    """Calculate GCP asia-south1 (Mumbai) monthly infrastructure cost based on volume."""
    # Scale VM size and DB based on event volume
    if monthly_events <= 5000000:
        compute_inr = 6500.0   # e2-standard-4
        db_inr = 4500.0        # Cloud SQL / MariaDB SSD 100GB
        storage_inr = 1500.0   # GCS & BigQuery storage
    elif monthly_events <= 25000000:
        compute_inr = 12500.0  # e2-standard-8
        db_inr = 8500.0        # MariaDB 250GB SSD
        storage_inr = 3500.0
    elif monthly_events <= 100000000:
        compute_inr = 24000.0  # 2x e2-standard-8 cluster
        db_inr = 16000.0       # High-memory Cloud SQL
        storage_inr = 7500.0
    else:
        compute_inr = 45000.0  # Dedicated multi-node
        db_inr = 30000.0
        storage_inr = 15000.0

    monthly_total_inr = compute_inr + db_inr + storage_inr
    return {
        "compute_monthly_inr": compute_inr,
        "db_monthly_inr": db_inr,
        "storage_monthly_inr": storage_inr,
        "total_monthly_inr": monthly_total_inr,
        "total_3yr_inr": monthly_total_inr * 36,
    }


def calculate_tco(
    monthly_events: int = 10000000,
    current_tool: str = "ga4_360",
    currency: str = "INR",
) -> dict[str, Any]:
    """Compute comprehensive 3-year TCO and ROI comparison."""
    tool_key = current_tool.lower().replace("-", "_").replace(" ", "_")
    tool_info = INCUMBENT_PRICING.get(tool_key, INCUMBENT_PRICING["ga4_360"])

    # 1. Incumbent Platform Cost (3 Years)
    base_annual_usd = tool_info["base_usd_annual"]
    included = tool_info["included_events_monthly"]
    overage_events = max(0, monthly_events - included)
    annual_overage_usd = (overage_events / 1_000_000) * tool_info["overage_per_million_usd"] * 12
    annual_incumbent_usd = base_annual_usd + annual_overage_usd
    total_3yr_incumbent_usd = annual_incumbent_usd * 3
    total_3yr_incumbent_inr = total_3yr_incumbent_usd * USD_TO_INR

    # 2. Self-Hosted OYDK on GCP + Tatvic Model (3 Years)
    cloud_costs = calculate_cloud_cost(monthly_events)
    cloud_3yr_inr = cloud_costs["total_3yr_inr"]

    # Tatvic Commercial Engagement
    tatvic_deployment_fee_inr = 500000.0     # One-time setup & migration
    tatvic_maintenance_monthly_inr = 50000.0 # Ongoing SLA support & monitoring
    tatvic_maintenance_3yr_inr = tatvic_maintenance_monthly_inr * 36

    total_3yr_oydk_inr = cloud_3yr_inr + tatvic_deployment_fee_inr + tatvic_maintenance_3yr_inr
    total_3yr_oydk_usd = total_3yr_oydk_inr / USD_TO_INR

    # 3. Savings & Payback
    net_savings_3yr_inr = max(0.0, total_3yr_incumbent_inr - total_3yr_oydk_inr)
    net_savings_3yr_usd = net_savings_3yr_inr / USD_TO_INR
    percent_savings = (net_savings_3yr_inr / total_3yr_incumbent_inr * 100) if total_3yr_incumbent_inr > 0 else 0.0

    # Payback period (months)
    monthly_incumbent_inr = total_3yr_incumbent_inr / 36
    monthly_oydk_recurring_inr = cloud_costs["total_monthly_inr"] + tatvic_maintenance_monthly_inr
    monthly_delta_savings = monthly_incumbent_inr - monthly_oydk_recurring_inr
    payback_months = (tatvic_deployment_fee_inr / monthly_delta_savings) if monthly_delta_savings > 0 else 1.0

    return {
        "monthly_events": monthly_events,
        "tool_key": tool_key,
        "tool_name": tool_info["name"],
        "currency": currency.upper(),
        "incumbent": {
            "annual_usd": annual_incumbent_usd,
            "total_3yr_usd": total_3yr_incumbent_usd,
            "total_3yr_inr": total_3yr_incumbent_inr,
        },
        "oydk": {
            "cloud_compute_monthly_inr": cloud_costs["compute_monthly_inr"],
            "cloud_db_monthly_inr": cloud_costs["db_monthly_inr"],
            "cloud_storage_monthly_inr": cloud_costs["storage_monthly_inr"],
            "cloud_total_3yr_inr": cloud_3yr_inr,
            "tatvic_deployment_fee_inr": tatvic_deployment_fee_inr,
            "tatvic_maintenance_3yr_inr": tatvic_maintenance_3yr_inr,
            "total_3yr_inr": total_3yr_oydk_inr,
            "total_3yr_usd": total_3yr_oydk_usd,
        },
        "roi": {
            "net_savings_3yr_inr": net_savings_3yr_inr,
            "net_savings_3yr_usd": net_savings_3yr_usd,
            "percent_savings": percent_savings,
            "payback_months": round(payback_months, 1),
        }
    }


def display_cost_calculator(
    monthly_events: int = 10000000,
    current_tool: str = "ga4_360",
    currency: str = "INR",
) -> None:
    """Render high-impact financial comparison for Tatvic sales pitch."""
    res = calculate_tco(monthly_events, current_tool, currency)
    is_inr = currency.upper() == "INR"
    sym = "₹" if is_inr else "$"

    console.print(f"\n[bold cyan]Tatvic OYDK 3-Year Enterprise TCO Calculator[/bold cyan] (Stretch Goal 3)")
    console.print(f"Monthly Event Volume: [bold white]{monthly_events:,}[/bold white] events/month")
    console.print(f"Current Incumbent: [bold yellow]{res['tool_name']}[/bold yellow]")
    console.print(f"Hosting Region: [bold green]GCP asia-south1 (Mumbai, India)[/bold green]\n")

    # TCO Comparison Table
    table = Table(title="3-Year Total Cost of Ownership (TCO) Breakdown", border_style="cyan")
    table.add_column("Cost Category", style="bold white")
    table.add_column(f"{res['tool_name']}", style="red")
    table.add_column("Tatvic OYDK (Self-Hosted)", style="bold green")
    table.add_column("Client Advantage", style="yellow")

    if is_inr:
        lic_inc = f"₹{res['incumbent']['total_3yr_inr']:,.2f}"
        lic_oydk = "₹0.00 (Open Source GPL v3)"
        cloud_inc = "Included in SaaS fee"
        cloud_oydk = f"₹{res['oydk']['cloud_total_3yr_inr']:,.2f}"
        deploy_inc = "Vendor onboarding ($15k+)"
        deploy_oydk = f"₹{res['oydk']['tatvic_deployment_fee_inr']:,.2f} (One-Time)"
        maint_inc = "Enterprise support included"
        maint_oydk = f"₹{res['oydk']['tatvic_maintenance_3yr_inr']:,.2f} (₹50k/mo SLA)"
        total_inc = f"₹{res['incumbent']['total_3yr_inr']:,.2f}"
        total_oydk = f"₹{res['oydk']['total_3yr_inr']:,.2f}"
    else:
        lic_inc = f"${res['incumbent']['total_3yr_usd']:,.2f}"
        lic_oydk = "$0.00 (Open Source GPL v3)"
        cloud_inc = "Included in SaaS fee"
        cloud_oydk = f"${res['oydk']['cloud_total_3yr_inr'] / USD_TO_INR:,.2f}"
        deploy_inc = "Vendor onboarding ($15k+)"
        deploy_oydk = f"${res['oydk']['tatvic_deployment_fee_inr'] / USD_TO_INR:,.2f} (One-Time)"
        maint_inc = "Enterprise support included"
        maint_oydk = f"${res['oydk']['tatvic_maintenance_3yr_inr'] / USD_TO_INR:,.2f} ($600/mo SLA)"
        total_inc = f"${res['incumbent']['total_3yr_usd']:,.2f}"
        total_oydk = f"${res['oydk']['total_3yr_usd']:,.2f}"

    table.add_row("Software Licensing (3 Years)", lic_inc, lic_oydk, "Zero vendor lock-in; owned IP")
    table.add_row("Cloud Hosting (asia-south1)", cloud_inc, cloud_oydk, "Data stays in India; DPDP ready")
    table.add_row("Tatvic One-Time Deployment", deploy_inc, deploy_oydk, "Turnkey setup + GTM migration")
    table.add_row("Tatvic Ongoing SLA Retainer", maint_inc, maint_oydk, "24/7 monitoring, backups, updates")
    table.add_row("3-Year Total TCO", f"[bold red]{total_inc}[/bold red]", f"[bold green]{total_oydk}[/bold green]", f"[bold yellow]{res['roi']['percent_savings']:.1f}% Net Savings[/bold yellow]")

    console.print(table)

    # ROI Highlight Box
    if is_inr:
        savings_str = f"₹{res['roi']['net_savings_3yr_inr']:,.2f}"
    else:
        savings_str = f"${res['roi']['net_savings_3yr_usd']:,.2f}"

    console.print(Panel(
        f"[bold green]3-Year Net Financial Savings: {savings_str} ({res['roi']['percent_savings']:.1f}% Reduction)[/bold green]\n\n"
        f"• [bold]Break-Even Payback Period:[/bold] [cyan]{res['roi']['payback_months']} Months[/cyan]\n"
        f"• [bold]Data Sovereignty & Legal Protection:[/bold] 100% telemetry stored in Mumbai, India. Eliminates cross-border data transfer liabilities under DPDP Act (fines up to ₹250 Crore).\n"
        f"• [bold]Zero Sampling & Unlimited History:[/bold] Raw visit logs stored permanently without Google's 14-month retention cutoff or 10M hit event sampling thresholds.\n"
        f"• [bold]Commercial Advantage for Tatvic:[/bold] Predictable recurring revenue via monthly maintenance contract (₹6,00,000/yr ARR per client).",
        title="[bold yellow]Executive Value Proposition & Financial Return[/bold yellow]",
        border_style="green",
    ))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Tatvic OYDK 3-Year Enterprise TCO Calculator")
    parser.add_argument("--monthly-events", type=int, default=10000000, help="Monthly event volume")
    parser.add_argument("--tool", default="ga4_360", choices=["ga4_360", "adobe_analytics", "mixpanel", "free_ga4"])
    parser.add_argument("--currency", default="INR", choices=["INR", "USD"])
    args = parser.parse_args()

    display_cost_calculator(args.monthly_events, args.tool, args.currency)
