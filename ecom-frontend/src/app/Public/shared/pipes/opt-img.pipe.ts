import { Pipe, PipeTransform } from '@angular/core';

/**
 * `src | optImg : 400` returns a smaller, modern-format version of Cloudinary images
 * (f_auto picks WebP/AVIF, q_auto tunes quality, w_ caps the width). Other URLs are returned unchanged;
 * local uploads are already resized to WebP by the API.
 */
@Pipe({ name: 'optImg', standalone: false })
export class OptImgPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 600): string {
    if (!url) return 'assets/images/placeholder.png';
    const marker = '/image/upload/';
    if (!url.includes('res.cloudinary.com') || !url.includes(marker)) return url;
    const [base, rest] = url.split(marker);
    // Already transformed URLs keep their own settings
    if (/^[a-z]_[^/]+(,[a-z]_[^/]+)*\//.test(rest)) return url;
    const w = Math.round(width * 2); // sharp on high-density screens
    return `${base}${marker}f_auto,q_auto,c_limit,w_${w}/${rest}`;
  }
}
