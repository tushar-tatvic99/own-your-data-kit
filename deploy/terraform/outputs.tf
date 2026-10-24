output "scale_profile" {
  description = "Applied sizing profile"
  value       = var.scale_profile
}

output "machine_type" {
  description = "Effective GCE machine type"
  value       = local.effective_machine_type
}

output "disk_size_gb" {
  description = "Effective boot disk size (GB)"
  value       = local.effective_disk_size_gb
}

output "analytics_ip" {
  description = "Public IP of the analytics server"
  value       = google_compute_address.analytics_ip.address
}

output "matomo_url" {
  description = "Matomo URL (configure TLS after deploy)"
  value       = "https://matomo.${replace(google_compute_address.analytics_ip.address, ".", "-")}.nip.io"
}

output "kit_api_url" {
  description = "Kit API URL (DSAR, audit, connectors)"
  value       = "http://${google_compute_address.analytics_ip.address}:8090"
}

output "backup_bucket" {
  description = "GCS bucket for backups"
  value       = google_storage_bucket.backups.name
}

output "service_account" {
  description = "Analytics service account email"
  value       = google_service_account.analytics.email
}
