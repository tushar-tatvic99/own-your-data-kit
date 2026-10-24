variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "client_name" {
  description = "Short client identifier (lowercase, no spaces)"
  type        = string
  default     = "demo"
}

variable "region" {
  description = "GCP region — India by default"
  type        = string
  default     = "asia-south1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "asia-south1-a"
}

variable "scale_profile" {
  description = "Sizing profile: small | standard | enterprise (see docs/scaling.md)"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["small", "standard", "enterprise"], var.scale_profile)
    error_message = "scale_profile must be small, standard, or enterprise."
  }
}

variable "machine_type" {
  description = "Optional VM machine type override (empty = use scale_profile)"
  type        = string
  default     = ""
}

variable "disk_size_gb" {
  description = "Optional boot disk GB override (0 = use scale_profile)"
  type        = number
  default     = 0
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed to access the analytics server"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}
