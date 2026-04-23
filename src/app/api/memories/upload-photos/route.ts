import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageQuota } from '@/lib/storage/quota';
import { processUploadFaces } from '@/lib/photos/processUploadFaces';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const memoryId = formData.get('memoryId') as string;
    const photos = formData.getAll('photos') as File[];

    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    // Verify memory belongs to user
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', user.id)
      .single();

    if (memoryError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Enforce tier storage quota across the whole batch.
    const totalBatchBytes = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    const quota = await getStorageQuota(supabase, user.id);
    if (totalBatchBytes > quota.remaining) {
      return NextResponse.json(
        {
          error: 'Storage limit reached',
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
        },
        { status: 413 },
      );
    }

    const uploadedMedia: any[] = [];
    const admin = createAdminClient();

    for (const photo of photos) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const isImage = (photo.type || '').startsWith('image/');

      // Generate unique filename
      const ext = photo.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${memoryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Upload to Supabase storage (use 'memories' bucket to match existing code)
      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(fileName, buffer, {
          contentType: photo.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memories')
        .getPublicUrl(fileName);

      // Create media record
      const mediaResult = await supabase
        .from('memory_media')
        .insert({
          memory_id: memoryId,
          user_id: user.id,
          file_url: publicUrl,
          file_key: fileName,
          file_type: 'image',
          mime_type: photo.type || 'image/jpeg',
          file_size: photo.size,
          is_cover: uploadedMedia.length === 0, // First photo is cover
        })
        .select()
        .single();

      if (!mediaResult.error && mediaResult.data) {
        // Run Rekognition + save display_position inline so the caller can
        // render the photo with a face-aware crop on first paint.
        if (isImage) {
          await processUploadFaces({
            admin,
            userId: user.id,
            mediaId: mediaResult.data.id,
            imageBuffer: buffer,
          });
        }
        uploadedMedia.push(mediaResult.data);
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedMedia.length,
      media: uploadedMedia,
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
