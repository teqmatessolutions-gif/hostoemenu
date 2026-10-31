import { getMediaBaseUrl } from "./env";

/**
 * Robust utility to get the full URL of an image from its stored path.
 * Handles legacy paths, relative paths, and full URLs.
 * 
 * @param {string} imagePath - The path or URL stored in the database
 * @param {string} fallbackType - The type of placeholder to show if no image (default: 'No Image')
 * @returns {string} The full URL to the image or a placeholder
 */
export const getImageUrl = (imagePath, fallbackType = 'No Image') => {
    // 1. Handle empty or null paths
    if (!imagePath) {
        const text = encodeURIComponent(fallbackType);
        return `https://placehold.co/400x300/e2e8f0/a0aec0?text=${text}`;
    }

    // 2. Handle full URLs (http/https)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // 3. Normalize path (handle backslashes, trim whitespace)
    let path = imagePath.trim().replace(/\\/g, '/');

    // 4. Fix common storage inconsistencies
    // If the path already contains the full URL for some reason, return it
    if (path.includes('://')) return path;

    // 5. Fix legacy 'static/uploads' paths
    // Some old records might have 'static/uploads/...' which should just be 'uploads/...'
    if (path.includes('static/uploads/')) {
        path = path.replace(/.*?static\/uploads\//, 'uploads/');
    }

    // 6. Ensure path doesn't have double slashes at the start after normalization
    path = path.replace(/^\/+/, '');

    // 7. Get base URL from environment
    const baseUrl = getMediaBaseUrl();

    // 8. Combine and return
    // We ensure exactly one slash between baseUrl and path
    const separator = baseUrl.endsWith('/') ? '' : '/';
    return `${baseUrl}${separator}${path}`;
};
