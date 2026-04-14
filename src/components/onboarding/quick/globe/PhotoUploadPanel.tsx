import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, ChevronRight, Loader2, MapPin, X } from 'lucide-react';

export interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  fileUrl?: string;
  lat: number | null;
  lng: number | null;
  locationName: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

export interface PhotoUploadPanelProps {
  uploadedPhotos: UploadedPhoto[];
  setUploadedPhotos: React.Dispatch<React.SetStateAction<UploadedPhoto[]>>;
  /** Called after upload completes; parent decides next phase. */
  onUploadComplete: (hasGeo: boolean) => void;
  /** Called when user skips with zero photos. */
  onSkipEmpty: () => void;
  onBack?: () => void;
}

export function PhotoUploadPanel({
  uploadedPhotos,
  setUploadedPhotos,
  onUploadComplete,
  onSkipEmpty,
  onBack,
}: PhotoUploadPanelProps) {
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      key="photo-upload-panel"
      className="globe-floating-panel globe-floating-right globe-panel-wide"
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="globe-side-panel-header">
        <h3>📸 Your Photos</h3>
        <p>Upload your favorite photos. We&apos;ll place geotagged ones on the globe to map your memories around the world.</p>
      </div>
      <div className="globe-side-panel-items" style={{ gap: '0', padding: '8px 16px', overflowY: 'auto' }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingPhotos(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingPhotos(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingPhotos(false);
            if (e.dataTransfer.files?.length) {
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024);
              const newPhotos: UploadedPhoto[] = files.map(file => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                preview: URL.createObjectURL(file),
                lat: null,
                lng: null,
                locationName: null,
                status: 'pending' as const,
              }));
              setUploadedPhotos(prev => [...prev, ...newPhotos]);
            }
          }}
          onClick={() => photoInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDraggingPhotos ? '#2D5A3D' : 'rgba(0,0,0,0.15)'}`,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDraggingPhotos ? 'rgba(64,106,86,0.06)' : 'rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease',
            marginBottom: '12px',
          }}
        >
          <Camera size={28} color="#2D5A3D" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
            {uploadedPhotos.length === 0 ? 'Drop photos here or click to browse' : 'Add more photos'}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(45,45,45,0.5)', margin: '4px 0 0' }}>
            JPG, PNG up to 20MB each
          </p>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) {
              const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024);
              const newPhotos: UploadedPhoto[] = files.map(file => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                preview: URL.createObjectURL(file),
                lat: null,
                lng: null,
                locationName: null,
                status: 'pending' as const,
              }));
              setUploadedPhotos(prev => [...prev, ...newPhotos]);
            }
            if (photoInputRef.current) photoInputRef.current.value = '';
          }}
        />

        {/* Photo thumbnails grid */}
        {uploadedPhotos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '4px',
          }}>
            {uploadedPhotos.map((photo) => (
              <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden' }}>
                <img
                  src={photo.preview}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Status overlay */}
                {photo.status === 'uploading' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Loader2 size={20} color="white" className="animate-spin" />
                  </div>
                )}
                {photo.status === 'done' && (
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4, width: 20, height: 20,
                    borderRadius: '50%', background: '#2D5A3D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={12} color="white" />
                  </div>
                )}
                {photo.status === 'done' && photo.lat != null && (
                  <div style={{
                    position: 'absolute', bottom: 4, left: 4, padding: '2px 6px',
                    borderRadius: '8px', background: 'rgba(0,0,0,0.6)', fontSize: '9px',
                    color: 'white', display: 'flex', alignItems: 'center', gap: '2px',
                  }}>
                    <MapPin size={8} /> GPS
                  </div>
                )}
                {photo.status === 'error' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(200,50,50,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: 'white', fontWeight: 600,
                  }}>
                    Failed
                  </div>
                )}
                {/* Remove button */}
                {photo.status !== 'uploading' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      URL.revokeObjectURL(photo.preview);
                      setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
                    }}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                      borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'white',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {uploadedPhotos.length > 0 && (
          <p style={{ fontSize: '12px', color: 'rgba(45,45,45,0.5)', marginTop: '8px' }}>
            📷 {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
      <div className="globe-side-panel-footer">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="globe-back-btn"
            disabled={isUploadingPhotos}
            aria-label="Back"
          >
            ‹ Back
          </button>
        )}
        <button
          className="globe-continue-btn"
          disabled={isUploadingPhotos}
          onClick={async () => {
            if (uploadedPhotos.length === 0) {
              // Skip — no photos
              onSkipEmpty();
              return;
            }

            // Upload all pending photos
            setIsUploadingPhotos(true);
            const pendingPhotos = uploadedPhotos.filter(p => p.status === 'pending');

            for (const photo of pendingPhotos) {
              setUploadedPhotos(prev => prev.map(p =>
                p.id === photo.id ? { ...p, status: 'uploading' as const } : p
              ));

              try {
                const formData = new FormData();
                formData.append('file', photo.file);
                const res = await fetch('/api/onboarding/upload-image', { method: 'POST', body: formData });

                if (res.ok) {
                  const data = await res.json();
                  setUploadedPhotos(prev => prev.map(p =>
                    p.id === photo.id ? {
                      ...p,
                      status: 'done' as const,
                      fileUrl: data.fileUrl,
                      lat: data.metadata?.lat ?? null,
                      lng: data.metadata?.lng ?? null,
                      locationName: data.metadata?.locationName ?? null,
                    } : p
                  ));
                } else {
                  setUploadedPhotos(prev => prev.map(p =>
                    p.id === photo.id ? { ...p, status: 'error' as const } : p
                  ));
                }
              } catch {
                setUploadedPhotos(prev => prev.map(p =>
                  p.id === photo.id ? { ...p, status: 'error' as const } : p
                ));
              }
            }

            setIsUploadingPhotos(false);

            // Check if any photos have geolocation — use latest state
            setUploadedPhotos(prev => {
              const geoPhotos = prev.filter(p => p.status === 'done' && p.lat != null && p.lng != null);
              // Defer phase change to avoid state update during render
              setTimeout(() => onUploadComplete(geoPhotos.length > 0), 50);
              return prev;
            });
          }}
        >
          {isUploadingPhotos ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading...</>
          ) : (
            <>{uploadedPhotos.length > 0 ? 'Upload & Continue' : 'Skip'} <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </motion.div>
  );
}
