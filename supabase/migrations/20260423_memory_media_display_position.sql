-- Smart photo framing: store a focal point so `object-position` can keep
-- faces (or whatever the primary subject is) visible when the image is
-- cropped with `object-fit: cover`. Values are 0-1 normalized coordinates
-- matching the Rekognition bounding-box format used elsewhere in this repo.
-- NULL = no detection has run yet (fallback to the app's generic "face bias"
-- position). A value of (0.5, 0.5) is an explicit "center looks fine" result.

ALTER TABLE memory_media
  ADD COLUMN IF NOT EXISTS display_position_x numeric(5,4),
  ADD COLUMN IF NOT EXISTS display_position_y numeric(5,4);

ALTER TABLE memory_media
  ADD CONSTRAINT memory_media_display_position_x_range
    CHECK (display_position_x IS NULL OR (display_position_x >= 0 AND display_position_x <= 1)),
  ADD CONSTRAINT memory_media_display_position_y_range
    CHECK (display_position_y IS NULL OR (display_position_y >= 0 AND display_position_y <= 1));
