import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SeoTitleStrategy } from './seo-title.strategy';

describe('SeoTitleStrategy', () => {
  let strategy: SeoTitleStrategy;
  let title: Title;
  let meta: Meta;

  const snapshot = (routeTitle: string | undefined, data: any = {}) => {
    const leaf: any = { data, firstChild: null, title: routeTitle };
    return { root: { firstChild: leaf, data: {} } } as any;
  };

  beforeEach(() => {
    strategy = TestBed.inject(SeoTitleStrategy);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
    spyOn(strategy, 'buildTitle').and.callFake((s: any) => s.root.firstChild.title);
  });

  it('suffixes route titles and resets the description', () => {
    strategy.updateTitle(snapshot('Shop', { description: 'Shop everything' }));
    expect(title.getTitle()).toBe('Shop | DopeShope');
    expect(meta.getTag('name="description"')?.content).toBe('Shop everything');
    expect(meta.getTag('property="og:title"')?.content).toBe('Shop | DopeShope');
  });

  it('leaves pages that manage their own tags alone', () => {
    title.setTitle('Tee | DopeShope');
    strategy.updateTitle(snapshot(undefined, { seoManaged: true }));
    expect(title.getTitle()).toBe('Tee | DopeShope');
  });
});
