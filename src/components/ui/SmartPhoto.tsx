/**
 * SmartPhoto renders a user-uploaded photo with a focal point that keeps the
 * face visible even when the container crops the image. It reads the
 * `display_position_x/y` that the upload pipeline persisted to memory_media.
 *
 * Defaults to `object-fit: cover`. If no focal point is provided it falls
 * back to a top-biased position (see DEFAULT_DISPLAY_POSITION).
 */

import React from 'react'
import { toObjectPositionCss, type DisplayPosition } from '@/lib/photos/displayPosition'

type NativeImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'style'>

export interface SmartPhotoProps extends NativeImgProps {
  src: string
  alt: string
  /** Focal point in 0-1 coordinates, usually from memory_media. */
  displayPosition?: Partial<DisplayPosition> | null
  /** Shortcut when you already have the two numeric columns. */
  displayPositionX?: number | null
  displayPositionY?: number | null
  /** Default 'cover'. Pass 'contain' when you'd rather letterbox than crop. */
  objectFit?: 'cover' | 'contain'
  /** Extra inline styles merged onto the img. */
  style?: React.CSSProperties
}

export function SmartPhoto({
  src,
  alt,
  displayPosition,
  displayPositionX,
  displayPositionY,
  objectFit = 'cover',
  style,
  className,
  ...rest
}: SmartPhotoProps) {
  const pos =
    displayPosition ??
    (displayPositionX != null || displayPositionY != null
      ? { x: displayPositionX ?? undefined, y: displayPositionY ?? undefined }
      : null)

  const objectPosition = toObjectPositionCss(pos)

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit,
        objectPosition,
        ...style,
      }}
    />
  )
}
