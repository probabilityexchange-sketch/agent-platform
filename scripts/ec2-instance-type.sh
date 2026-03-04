#!/usr/bin/env bash

set -euo pipefail

INSTANCE_ID=""
REGION=""
TO_TYPE=""
PROFILE=""
CREATE_AMI=0
AMI_NAME_PREFIX="agent-platform-pre-scale"

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/ec2-instance-type.sh \
    --instance-id i-xxxxxxxx \
    --region us-east-1 \
    --to-type t3.large \
    [--profile default] \
    [--create-ami]

What it does:
  1) (Optional) creates an AMI backup
  2) stops the instance
  3) changes instance type
  4) starts the instance
  5) waits for instance + status checks OK

Must be run from a machine with AWS CLI credentials.
USAGE
}

log() {
  printf '[ec2-instance-type] %s\n' "$*"
}

fatal() {
  printf '[ec2-instance-type] ERROR: %s\n' "$*" >&2
  exit 1
}

aws_cmd() {
  local args=("$@")
  if [[ -n "$PROFILE" ]]; then
    aws --profile "$PROFILE" "${args[@]}"
  else
    aws "${args[@]}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --instance-id)
      INSTANCE_ID="${2:-}"
      shift
      ;;
    --region)
      REGION="${2:-}"
      shift
      ;;
    --to-type)
      TO_TYPE="${2:-}"
      shift
      ;;
    --profile)
      PROFILE="${2:-}"
      shift
      ;;
    --create-ami)
      CREATE_AMI=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fatal "Unknown argument: $1"
      ;;
  esac
  shift
done

command -v aws >/dev/null 2>&1 || fatal "aws CLI is required"
[[ -n "$INSTANCE_ID" ]] || fatal "--instance-id is required"
[[ -n "$REGION" ]] || fatal "--region is required"
[[ -n "$TO_TYPE" ]] || fatal "--to-type is required"

CURRENT_TYPE="$(aws_cmd ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].InstanceType' \
  --output text)"

[[ "$CURRENT_TYPE" != "None" ]] || fatal "Unable to resolve instance type for $INSTANCE_ID"

log "Current type: $CURRENT_TYPE"
log "Target type:  $TO_TYPE"

if [[ "$CURRENT_TYPE" == "$TO_TYPE" ]]; then
  log "Instance already on target type. Nothing to do."
  exit 0
fi

if [[ "$CREATE_AMI" -eq 1 ]]; then
  AMI_NAME="${AMI_NAME_PREFIX}-${INSTANCE_ID}-$(date +%Y%m%d-%H%M%S)"
  log "Creating AMI backup: $AMI_NAME"
  AMI_ID="$(aws_cmd ec2 create-image \
    --region "$REGION" \
    --instance-id "$INSTANCE_ID" \
    --name "$AMI_NAME" \
    --no-reboot \
    --query 'ImageId' \
    --output text)"
  log "AMI requested: $AMI_ID"
fi

log "Stopping instance"
aws_cmd ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
aws_cmd ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"

log "Modifying instance type -> $TO_TYPE"
aws_cmd ec2 modify-instance-attribute \
  --region "$REGION" \
  --instance-id "$INSTANCE_ID" \
  --instance-type "{\"Value\":\"$TO_TYPE\"}"

log "Starting instance"
aws_cmd ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
aws_cmd ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
aws_cmd ec2 wait instance-status-ok --region "$REGION" --instance-ids "$INSTANCE_ID"

NEW_TYPE="$(aws_cmd ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].InstanceType' \
  --output text)"

log "Scale complete. New instance type: $NEW_TYPE"
