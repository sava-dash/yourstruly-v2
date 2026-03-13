# Face Detection Migration: TensorFlow → AWS Rekognition

## What Changed

### ❌ Removed (TensorFlow.js - incompatible with Next.js)
- `@tensorflow/tfjs-node`
- `@tensorflow/tfjs-core`
- `@tensorflow/tfjs`
- `@vladmandic/face-api`
- `canvas` package
- `src/lib/ai/faceDetection.ts`
- `public/models/face-api/` (all models)

### ✅ Added (AWS Rekognition - production-ready)
- `@aws-sdk/client-rekognition`
- `src/lib/aws/rekognition.ts` (new face detection service)
- Updated `src/app/api/memories/[id]/media/route.ts` to use Rekognition

## How It Works Now

### 1. **Face Detection** (Automatic on Upload)
```typescript
// When user uploads photo:
const faces = await detectFaces(imageBuffer)
// Returns: boundingBox, confidence, age, gender, emotions
```

### 2. **Face Data Stored**
- Bounding boxes (normalized 0-1)
- Confidence scores
- Age range (low/high)
- Gender + confidence
- Dominant emotion

### 3. **Next Steps** (Not Yet Implemented)
- **Face Indexing**: `indexFace()` - Add faces to Rekognition collection
- **Face Matching**: `searchFaces()` - Auto-suggest contacts when tagging
- **Smart Albums**: Group photos by detected people

## Setup Required

### AWS Credentials

Add to `.env.local`:
```bash
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
```

### IAM Permissions Required

The IAM user needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:IndexFaces",
        "rekognition:CreateCollection",
        "rekognition:DeleteFaces",
        "rekognition:CompareFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

## Cost Estimate

- **Face Detection**: $1 per 1,000 images
- **Face Indexing**: $0.25 per 1,000 faces
- **Face Matching**: $0.10 per 1,000 searches

**Example:** 1,000 uploads/month = ~$1.35/month

## Testing

1. **Add AWS credentials** to `.env.local`
2. **Upload a photo** with people
3. **Check logs** for `[Rekognition]` messages
4. **Verify face boxes** appear in UI

## Logs to Watch

```bash
[Rekognition] Detecting faces, buffer size: 4834784
[Rekognition] ✅ Detected 2 faces
[Media Upload] ✅ Rekognition found 2 faces
[Media Upload] ✅ Saved 2 face records
```

## Future Enhancements

### Phase 1: Auto-Tagging (Next)
- Index faces when user manually tags someone
- Auto-suggest contacts when uploading new photos
- "Is this [Contact Name]?" confirmation UI

### Phase 2: Smart Albums
- "People" album - group by detected person
- "Family" album - group by relationship
- "Events" album - group by date + location + people

### Phase 3: Advanced Features
- Face aging detection (child vs adult photos)
- Family resemblance detection
- Duplicate photo detection
- Photo quality scoring

## Troubleshooting

### No faces detected
- Check AWS credentials are set
- Verify IAM permissions
- Check Rekognition service is available in your region
- Image must be JPEG or PNG
- Faces must be at least 40x40 pixels

### Errors in logs
```bash
# Check Rekognition is configured:
tail -f /tmp/yt-dev.log | grep Rekognition

# Test credentials:
aws rekognition detect-faces --region us-east-2 \
  --image '{"S3Object":{"Bucket":"test","Name":"photo.jpg"}}'
```

## Migration Complete ✅

Face detection now uses AWS Rekognition instead of TensorFlow.js. No more webpack/module conflicts!
