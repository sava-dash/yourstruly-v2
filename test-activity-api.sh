#!/bin/bash
# Test the activity API to see what it's actually returning

echo "🔍 Testing Activity API..."
echo ""

# Get the response from the activity API
curl -s 'https://app.yourstruly.love/api/activity?limit=5' \
  -H 'Cookie: sb-access-token=YOUR_TOKEN_HERE' | jq '.activities[] | {id, type, link, title}'

echo ""
echo "✅ Check if 'link' fields have IDs at the end"
echo "❌ If links end with /memories or /wisdom (no ID), there's still a problem"
