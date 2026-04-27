declare module "*.svg?url" {
  /** O bundler do Next pode expor só a URL ou um objeto estilo `StaticImageData` com `src`. */
  const asset: string | { src: string; width?: number; height?: number };
  export default asset;
}
