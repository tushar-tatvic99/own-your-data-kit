output "analytics_ip" {
  description = "Public IP of the analytics server"
  value       = google_compute_address.analytics_ip.address
}

output "matomo_url" {
  description = "Matomo URL (configure TLS after deploy)"
  value       = "http://${google_compute_address.analytics_ip.address}:8080"
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
