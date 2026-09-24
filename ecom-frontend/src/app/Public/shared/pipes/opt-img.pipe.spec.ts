import { OptImgPipe } from './opt-img.pipe';

describe('OptImgPipe', () => {
  const pipe = new OptImgPipe();

  it('adds size and format transforms to Cloudinary URLs', () => {
    expect(pipe.transform('https://res.cloudinary.com/demo/image/upload/v17/dopeshope/products/tee.jpg', 300)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_600/v17/dopeshope/products/tee.jpg'
    );
  });

  it('leaves other URLs and already-transformed ones alone', () => {
    expect(pipe.transform('assets/images/product.png', 300)).toBe('assets/images/product.png');
    const done = 'https://res.cloudinary.com/demo/image/upload/w_100/v1/x.jpg';
    expect(pipe.transform(done, 300)).toBe(done);
  });

  it('falls back to the placeholder', () => {
    expect(pipe.transform(null)).toBe('assets/images/placeholder.png');
  });
});
