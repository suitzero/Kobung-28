#!/usr/bin/env bash
# Spot/preemptible GCE instances do NOT auto-restart themselves after being
# reclaimed. Run this (manually, or on a cron/Cloud Scheduler) to bring the
# server back up if it was preempted.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"
ZONE="${GCP_ZONE:?set GCP_ZONE}"
INSTANCE="deepseek-vllm-server"

STATUS=$(gcloud compute instances describe "$INSTANCE" \
  --project="$PROJECT_ID" --zone="$ZONE" --format='value(status)')

echo "Instance status: $STATUS"

if [ "$STATUS" = "TERMINATED" ]; then
  echo "Restarting $INSTANCE..."
  gcloud compute instances start "$INSTANCE" --project="$PROJECT_ID" --zone="$ZONE"
else
  echo "Nothing to do."
fi
