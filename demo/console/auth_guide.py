"""What Google / GCP auth each user needs (local console vs hosted)."""

from demo.console.runtime import deploy_capabilities


def google_auth_guide(config_path: str, runtime: dict | None = None) -> dict:
    caps = runtime or deploy_capabilities()
    hosted = caps.get("host") == "cloud_run"
    return {
        "runtime": caps,
        "hosted_console": hosted,
        "summary": (
            "On the shared Cloud Run URL, Google sign-in is not done in the browser. "
            "Live GA4/GTM uses the service account file + secrets on the server. "
            "Each judge deploys GCP from their own laptop with gcloud."
            if hosted
            else "On your laptop, use Sign in to Google Cloud for deploy/Terraform; "
            "use GA service account JSON + Matomo token for live migration and parity."
        ),
        "needs": [
            {
                "task": "Live migration, parity, Matomo API",
                "google_auth": "GA4/GTM service account JSON (credentials/ga-service-account.json) — not gcloud user login",
                "also": "MATOMO_API_TOKEN in .env",
                "where": "Repo .env + YAML on the PC running the console (or Cloud Run secrets if hosted)",
            },
            {
                "task": "Deploy Matomo stack to GCP (Terraform / VM)",
                "google_auth": "gcloud auth login + gcloud auth application-default login",
                "also": "gcloud config set project YOUR_PROJECT_ID",
                "where": "Only on the user's Windows laptop (Demo → Sign in to Google Cloud)",
            },
            {
                "task": "BigQuery export / some connectors",
                "google_auth": "Same service account or ADC after application-default login",
                "also": "BigQuery API enabled on the project",
                "where": "Laptop or server credentials",
            },
        ],
        "laptop_steps": [
            "Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install",
            "In OYDK: Demo mode → Sign in to Google Cloud (opens browser + terminal)",
            "Enter the GCP project ID from Deploy form, then Refresh gcloud status",
            "Place GA service account JSON and MATOMO_API_TOKEN in .env before live suite",
        ],
        "hosted_note": (
            "Sharing the Cloud Run link does not run gcloud for visitors. "
            "For a fully custom GCP project they must clone the repo, auth locally, and run demo-ui on 127.0.0.1:8765."
        ),
    }
