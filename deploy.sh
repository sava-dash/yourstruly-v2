#!/bin/bash
set -euo pipefail

# YoursTruly V2 — Deploy to AWS ECS
# Usage: ./deploy.sh [--skip-push] [--skip-build]

REGION="us-east-2"
ECR_REPO="549083880218.dkr.ecr.us-east-2.amazonaws.com/yourstruly"
CLUSTER="yourstruly-cluster"
SERVICE="yourstruly-service"
IMAGE_NAME="yourstruly"

SKIP_BUILD=false
SKIP_PUSH=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-push) SKIP_PUSH=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

cd "$(dirname "$0")"

# ── Load NEXT_PUBLIC_ build args from .env.local ──
echo "📦 Loading build args from .env.local..."
BUILD_ARGS=""
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  if [[ "$key" == NEXT_PUBLIC_* ]]; then
    # Override localhost APP_URL with production
    if [[ "$key" == "NEXT_PUBLIC_APP_URL" ]]; then
      value="https://app.yourstruly.love"
    fi
    BUILD_ARGS="$BUILD_ARGS --build-arg $key=$value"
    echo "  ✓ $key"
  fi
done < .env.local

# ── Git push ──
if [[ "$SKIP_PUSH" == false ]]; then
  UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l)
  if [[ "$UNPUSHED" -gt 0 ]]; then
    echo ""
    echo "🚀 Pushing $UNPUSHED commit(s) to GitHub..."
    git push origin main
  else
    echo ""
    echo "✓ Git is up to date"
  fi
fi

# ── Docker build ──
if [[ "$SKIP_BUILD" == false ]]; then
  echo ""
  echo "🐳 Building Docker image with production build args..."
  eval docker build $BUILD_ARGS -t "$IMAGE_NAME" .
else
  echo ""
  echo "⏭️  Skipping build"
fi

# ── ECR login + push ──
echo ""
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REPO" 2>/dev/null

echo "📤 Pushing to ECR..."
docker tag "$IMAGE_NAME:latest" "$ECR_REPO:latest"
docker push "$ECR_REPO:latest"

# ── ECS redeploy ──
echo ""
echo "♻️  Triggering ECS redeployment..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  --query 'service.{status:status,desired:desiredCount}' \
  --output table

echo ""
echo "✅ Deploy triggered! Service will be live in ~2 minutes."
echo "   https://app.yourstruly.love"
