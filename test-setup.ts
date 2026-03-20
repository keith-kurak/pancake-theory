// @ts-ignore
import { plugin } from "bun";

plugin({
  name: "mock-assets",
  // @ts-ignore
  setup(build) {
    build.onLoad({ filter: /\.(png|jpg|jpeg|gif|webp|svg)$/ }, () => ({
      contents: 'module.exports = "test-file-stub"',
      loader: "js",
    }));
  },
});
