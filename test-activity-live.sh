#!/bin/bash
# Test the live activity API

echo "🔍 Testing live activity API at app.yourstruly.love..."
echo ""

# You'll need to get your session cookie from the browser
# Open DevTools -> Application -> Cookies -> sb-access-token
echo "❌ Need session token to test"
echo ""
echo "To get your token:"
echo "1. Open DevTools (F12)"
echo "2. Go to Application tab"
echo "3. Cookies -> https://app.yourstruly.love"
echo "4. Copy the 'sb-access-token' value"
echo ""
echo "Then run:"
echo "  curl -s 'https://app.yourstruly.love/api/activity?limit=5' \\"
echo "    -H 'Cookie: sb-access-token=YOUR_TOKEN' | jq '.activities[] | {type, title, link}'"
