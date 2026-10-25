# Sizing profiles — override with -var machine_type= / disk_size_gb= if needed.

locals {
  scale_profiles = {
    small = {
      machine_type = "e2-standard-2"
      disk_size_gb = 50
      events_hint  = "Up to ~500k hits/month (pilot / low traffic)"
    }
    standard = {
      machine_type = "e2-standard-4"
      disk_size_gb = 100
      events_hint  = "Up to ~5M hits/month (default marketing site)"
    }
    enterprise = {
      machine_type = "e2-standard-16"
      disk_size_gb = 500
      events_hint  = "Up to ~50M+ hits/month (tune + see docs/scaling.md for multi-node)"
    }
  }

  profile = local.scale_profiles[var.scale_profile]

  effective_machine_type = var.machine_type != "" ? var.machine_type : local.profile.machine_type
  effective_disk_size_gb   = var.disk_size_gb > 0 ? var.disk_size_gb : local.profile.disk_size_gb
}
