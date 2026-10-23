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

variable "machine_type" {
  description = "VM machine type"
  type        = string
  default     = "e2-standard-4"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB"
  type        = number
  default     = 100
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed to access the analytics server"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}
