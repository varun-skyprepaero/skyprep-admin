import { useRef, useState } from 'react'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { uploadCoverImage } from '@/features/tests/api/media-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError } from '@/lib/notifications'
import { cn } from '@/lib/utils'

/** Matches classroom catalog card banner (h-36 + object-cover). */
const COVER_IMAGE_HINT =
  'Recommended: 1280 × 720 px (16∶9) or larger. The student catalog shows this as a wide banner (~144 px tall); keep titles and faces centered so edges are not cropped.'

/**
 * @param {{
 *   value?: string | null,
 *   mediaUuid?: string | null,
 *   onChange: (next: { coverImageUrl: string | null, coverMediaUuid: string | null }) => void,
 *   disabled?: boolean,
 *   purpose?: 'test_series_cover' | 'quiz_cover',
 *   entityUuid?: string | null,
 *   entityType?: 'test-series' | 'quiz',
 * }} props
 */
export function CoverImageField({
  value = null,
  mediaUuid = null,
  onChange,
  disabled = false,
  purpose = 'test_series_cover',
  entityUuid = null,
  entityType,
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || disabled) return

    if (!file.type.startsWith('image/')) {
      notifyError('Please choose an image file (PNG, JPG, WebP).')
      return
    }

    setUploading(true)
    try {
      const result = await uploadCoverImage(file, {
        purpose,
        entityUuid,
        entityType: entityType ?? (purpose === 'quiz_cover' ? 'quiz' : 'test-series'),
      })
      onChange({
        coverImageUrl: result.coverImageUrl,
        coverMediaUuid: result.coverMediaUuid,
      })
    } catch (error) {
      notifyError(handleApiError(error, 'Could not upload image').message)
    } finally {
      setUploading(false)
    }
  }

  function clearImage() {
    onChange({ coverImageUrl: null, coverMediaUuid: null })
  }

  return (
    <div className="space-y-2">
      <Label>Cover image</Label>
      <p className="text-xs leading-relaxed text-muted-foreground">{COVER_IMAGE_HINT}</p>
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-dashed border-border/80 bg-background/80',
          value ? 'border-solid' : '',
        )}
      >
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="Test series cover preview"
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || uploading}
                onClick={clearImage}
              >
                <Trash2 className="size-4" aria-hidden />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
            )}
            <span className="text-sm font-medium text-foreground">
              {uploading ? 'Uploading…' : 'Upload cover image'}
            </span>
            <span className="max-w-sm text-xs text-muted-foreground">
              PNG, JPG, or WebP up to 5 MB.
            </span>
          </button>
        )}
      </div>
      {mediaUuid ? (
        <p className="text-[11px] text-muted-foreground">Asset ID: {mediaUuid}</p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleFileChange(e)}
      />
    </div>
  )
}
