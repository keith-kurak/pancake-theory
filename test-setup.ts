import { plugin } from 'bun';

plugin({
  name: 'mock-assets',
  setup(build) {
    build.onLoad({ filter: /\.(png|jpg|jpeg|gif|webp|svg)$/ }, () => ({
      contents: 'module.exports = "test-file-stub"',
      loader: 'js',
    }));
  },
});
