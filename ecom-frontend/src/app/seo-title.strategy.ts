import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SITE = 'DopeShope';
const DEFAULT_DESCRIPTION =
  'DopeShope: curated apparel and accessories. Free shipping, cash on delivery and 7-day easy returns.';

/**
 * Sets "<route title> | DopeShope" and resets the description/share tags on every navigation.
 * Pages with dynamic content (product detail) overwrite them after loading.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  constructor(private title: Title, private meta: Meta) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    // The page sets its own tags once its data loads
    if (route.data?.['seoManaged']) return;

    const routeTitle = this.buildTitle(snapshot);
    const title = routeTitle ? `${routeTitle} | ${SITE}` : `${SITE} | Where Style Meets Elegance`;
    const description = route.data?.['description'] || DEFAULT_DESCRIPTION;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.removeTag("property='og:image'");
  }
}
