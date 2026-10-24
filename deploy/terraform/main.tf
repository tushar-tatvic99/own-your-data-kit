terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# VPC
resource "google_compute_network" "vpc" {
  name                    = "${var.client_name}-analytics-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.client_name}-analytics-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Firewall — allow HTTP/HTTPS and SSH from admin IPs only
resource "google_compute_firewall" "allow_web" {
  name    = "${var.client_name}-allow-web"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "22", "8080", "8090"]
  }

  source_ranges = var.admin_cidr_blocks
  target_tags   = ["analytics-server"]
}

# Static IP
resource "google_compute_address" "analytics_ip" {
  name   = "${var.client_name}-analytics-ip"
  region = var.region
}

# VM — runs Docker Compose stack (Matomo + kit services)
resource "google_compute_instance" "analytics" {
  name         = "${var.client_name}-analytics"
  machine_type = local.effective_machine_type
  zone         = var.zone
  tags         = ["analytics-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = local.effective_disk_size_gb
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {
      nat_ip = google_compute_address.analytics_ip.address
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = templatefile("${path.module}/startup.sh.tpl", {
    client_name = var.client_name
  })

  service_account {
    email  = google_service_account.analytics.email
    scopes = ["cloud-platform"]
  }
}

# Service account for VM (backups, secrets, BigQuery export)
resource "google_service_account" "analytics" {
  account_id   = "${var.client_name}-analytics"
  display_name = "${var.client_name} Analytics Kit"
}

resource "google_project_iam_member" "analytics_roles" {
  for_each = toset([
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/bigquery.dataEditor",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.analytics.email}"
}

# GCS bucket for backups
resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-${var.client_name}-analytics-backups"
  location      = var.region
  force_destroy = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# Secret Manager — store Matomo API token after setup
resource "google_secret_manager_secret" "matomo_token" {
  secret_id = "${var.client_name}-matomo-api-token"
  replication {
    auto {}
  }
}

# Uptime check
resource "google_monitoring_uptime_check_config" "matomo" {
  display_name = "${var.client_name} Matomo Uptime"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/"
    port         = 443
    use_ssl      = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = google_compute_address.analytics_ip.address
    }
  }
}

# Scheduled backup via Cloud Scheduler (triggers gcloud on VM via metadata)
resource "google_cloud_scheduler_job" "daily_backup" {
  name        = "${var.client_name}-analytics-daily-backup"
  description = "Trigger daily Matomo DB backup to GCS"
  schedule    = "0 2 * * *"
  time_zone   = "Asia/Kolkata"

  http_target {
    uri         = "http://${google_compute_address.analytics_ip.address}:8090/internal/backup"
    http_method = "POST"
    # OIDC requires https:// — enable when TLS is on the kit API
  }
}

resource "google_cloud_scheduler_job" "daily_parity" {
  name        = "${var.client_name}-analytics-daily-parity"
  description = "Trigger daily GA4 vs Matomo parity check during migration"
  schedule    = "0 6 * * *"
  time_zone   = "Asia/Kolkata"

  http_target {
    uri         = "http://${google_compute_address.analytics_ip.address}:8090/internal/parity"
    http_method = "POST"
    body        = base64encode("{}")
    headers = {
      "Content-Type" = "application/json"
    }
  }
}

resource "google_cloud_scheduler_job" "weekly_retention" {
  name        = "${var.client_name}-analytics-weekly-retention"
  description = "Audit configured data retention policy"
  schedule    = "0 3 * * 1"
  time_zone   = "Asia/Kolkata"

  http_target {
    uri         = "http://${google_compute_address.analytics_ip.address}:8090/internal/retention"
    http_method = "POST"
  }
}
