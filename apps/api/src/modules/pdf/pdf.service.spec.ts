import { absoluteAssetUrl } from './pdf.service';

it('una ruta local /static se resuelve contra el propio API', () => {
  expect(absoluteAssetUrl('/static/a.jpg', 3100)).toBe('http://127.0.0.1:3100/static/a.jpg');
});

it('una URL de S3 se deja tal cual', () => {
  expect(absoluteAssetUrl('https://bucket.s3.amazonaws.com/a.jpg', 3100)).toBe('https://bucket.s3.amazonaws.com/a.jpg');
});
