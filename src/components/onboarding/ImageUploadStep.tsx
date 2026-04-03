'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ImageIcon,
  Sparkles,
  Check,
  Loader2,
  Camera,
  MapPin
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  memoryId?: string;
  mediaId?: string;
  locationName?: string;
  takenAt?: string;
}

interface ImageUploadStepProps {
  userId?: string;
  onBack: () => void;
  onContinue: (uploadedCount: number) => void;
  onSkip: () => void;
}

const SUGGESTED_MIN = 3;
const SUGGESTED_MAX = 10;

export function ImageUploadStep({ userId, onBack, onContinue, onSkip }: ImageUploadStepProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const addImages = useCallback((files: FileList | File[]) => {
    const newImages: UploadedImage[] = [];
    
    Array.from(files).forEach((file) => {
      // Only accept images
      if (!file.type.startsWith('image/')) return;
      // Max 20MB per image
      if (file.size > 20 * 1024 * 1024) return;
      
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      
      newImages.push({
        id,
        file,
        preview,
        status: 'pending',
      });
    });
    
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files?.length) {
      addImages(e.dataTransfer.files);
    }
  }, [addImages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addImages(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addImages]);

  const uploadImages = async () => {
    if (images.length === 0) {
      onContinue(0);
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      // Upload all pending images
      for (const image of images) {
        if (image.status !== 'pending') continue;

        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'uploading' } : img
        ));

        try {
          const formData = new FormData();
          formData.append('file', image.file);

          const res = await fetch('/api/onboarding/upload-image', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            setImages(prev => prev.map(img => 
              img.id === image.id 
                ? { 
                    ...img, 
                    status: 'done', 
                    memoryId: data.memoryId, 
                    mediaId: data.mediaId,
                    locationName: data.metadata?.locationName || undefined,
                    takenAt: data.metadata?.takenAt || undefined,
                  } 
                : img
            ));
            successCount++;
          } else {
            setImages(prev => prev.map(img => 
              img.id === image.id ? { ...img, status: 'error' } : img
            ));
          }
        } catch (err) {
          console.error('Upload error:', err);
          setImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, status: 'error' } : img
          ));
        }
      }
    } finally {
      setIsUploading(false);
    }

    // Short delay to show completion, then continue
    setTimeout(() => {
      onContinue(successCount);
    }, 500);
  };

  const pendingCount = images.filter(img => img.status === 'pending').length;
  const doneCount = images.filter(img => img.status === 'done').length;
  const hasEnoughImages = images.length >= SUGGESTED_MIN;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="glass-card glass-card-strong p-6"
      style={{ maxWidth: '560px', margin: '0 auto' }}
    >
      {/* Info card */}
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-gradient-to-br from-[#B8562E] to-[#C4A235] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Camera size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold text-[#2d2d2d] font-playfair">
          Turn your photos into real memories.
        </h2>
        <p className="text-gray-500 text-sm mt-2" style={{ lineHeight: '1.6' }}>
          Upload images and we&apos;ll organize them automatically —
          recognizing faces, grouping moments, and adding context along the way.
        </p>
        <p className="text-xs mt-2" style={{ color: 'rgba(45,45,45,0.4)', fontStyle: 'italic' }}>
          Your gallery becomes your story.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-[#2D5A3D] bg-[#2D5A3D]/10' 
            : 'border-gray-200 bg-white/50 hover:border-[#2D5A3D]/50 hover:bg-[#2D5A3D]/5'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${isDragging ? 'bg-[#2D5A3D]/20' : 'bg-gray-100'}
          `}>
            <Upload size={24} className={isDragging ? 'text-[#2D5A3D]' : 'text-gray-400'} />
          </div>
          
          <div>
            <p className="font-medium text-[#2d2d2d]">
              {isDragging ? 'Drop your photos here' : 'Drag photos here or tap to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG, HEIC • Up to 20MB each
            </p>
          </div>
        </div>
      </div>

      {/* Suggestion Badge */}
      {images.length === 0 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <Sparkles size={14} className="text-[#C4A235]" />
          <span className="text-xs text-gray-500">
            We suggest {SUGGESTED_MIN}-{SUGGESTED_MAX} photos to get the most out of YoursTruly
          </span>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#2d2d2d]">
              {images.length} photo{images.length !== 1 ? 's' : ''} selected
            </span>
            {doneCount > 0 && (
              <span className="text-xs text-[#2D5A3D] flex items-center gap-1">
                <Check size={12} />
                {doneCount} uploaded
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
            <AnimatePresence>
              {images.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
                >
                  <img
                    src={image.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Overlay */}
                  {image.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                  )}
                  
                  {image.status === 'done' && (
                    <div className="absolute inset-0 bg-[#2D5A3D]/20 flex flex-col items-center justify-end">
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      {image.locationName && (
                        <div className="w-full px-1 pb-1">
                          <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                            <MapPin size={8} className="text-white flex-shrink-0" />
                            <span className="text-[9px] text-white truncate">{image.locationName.split(',').slice(0, 2).join(',')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {image.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                      <X size={20} className="text-white" />
                    </div>
                  )}
                  
                  {/* Remove Button (only when pending) */}
                  {image.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(image.id);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 
                                 flex items-center justify-center opacity-0 group-hover:opacity-100
                                 transition-opacity"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Location Summary */}
      {(() => {
        const locations = images
          .filter(img => img.status === 'done' && img.locationName)
          .map(img => img.locationName!.split(',').slice(0, 2).join(',').trim());
        const uniqueLocations = [...new Set(locations)];
        if (uniqueLocations.length === 0) return null;
        return (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {uniqueLocations.map((loc, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-[#2D5A3D]/8 text-[#2D5A3D] rounded-full border border-[#2D5A3D]/15">
                <MapPin size={10} /> {loc}
              </span>
            ))}
          </div>
        );
      })()}

      {/* What Happens Next */}
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gradient-to-r from-[#2D5A3D]/5 to-[#8DACAB]/5 rounded-xl border border-[#2D5A3D]/10"
        >
          <p className="text-xs font-semibold text-[#2D5A3D] uppercase tracking-wide mb-2">
            What happens next
          </p>
          <ul className="space-y-1.5">
            {[
              "We'll organize these by date, location, and people",
              "You'll see them on your dashboard ready for tagging",
              "This is how your memories come to life"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#2d2d2d]/70">
                <Sparkles size={12} className="text-[#C4A235] flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button 
          onClick={onBack} 
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-[#2D5A3D] disabled:opacity-50"
        >
          <ChevronLeft size={18} /> Back
        </button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onSkip}
            disabled={isUploading}
            className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm disabled:opacity-50"
          >
            Skip for now
          </button>
          
          <button
            onClick={uploadImages}
            disabled={isUploading}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
              ${images.length > 0 
                ? 'bg-gradient-to-r from-[#2D5A3D] to-[#8DACAB] text-white hover:shadow-lg' 
                : 'bg-[#2D5A3D] text-white hover:bg-[#355a48]'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading...
              </>
            ) : images.length > 0 ? (
              <>
                <Sparkles size={16} />
                Upload & Continue
              </>
            ) : (
              <>
                Continue <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
