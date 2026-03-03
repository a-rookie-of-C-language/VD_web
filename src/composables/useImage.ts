import { getCoverImageUrl, getAttachmentUrl } from '@/util/util'

/**
 * Composable for handling image URLs with optimized loading
 */
export function useImage() {
  /**
   * Get cover image URL through preview API
   * @param relativePath - The relative path of the cover image
   * @param fallback - Fallback image path if the provided path is empty
   * @returns Full URL for the cover image or fallback
   */
  const getImageUrl = (relativePath?: string | null, fallback = ''): string => {
    if (!relativePath) return fallback
    return getCoverImageUrl(relativePath)
  }

  /**
   * Get attachment URL for download or preview
   * @param relativePath - The relative path of the attachment
   * @param type - 'download' or 'preview'
   * @returns Full URL for the attachment
   */
  const getAttachment = (relativePath: string, type: 'download' | 'preview' = 'download'): string => {
    return getAttachmentUrl(relativePath, type)
  }

  /**
   * Handle image load error
   * @param event - The error event
   * @param fallbackImage - Fallback image path
   */
  const handleImageError = (event: Event, fallbackImage = '/default.png') => {
    const target = event.target as HTMLImageElement
    if (target) {
      target.onerror = null // Prevent infinite loop
      target.src = fallbackImage
    }
  }

  return {
    getImageUrl,
    getAttachment,
    handleImageError
  }
}

