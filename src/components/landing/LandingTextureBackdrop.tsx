/** Product-site texture backdrop — mesh + grain, not landscape imagery. */
export function LandingTextureBackdrop() {
  return (
    <div className="scriptora-texture-backdrop" aria-hidden="true">
      <div className="scriptora-texture-mesh" />
      <div className="scriptora-texture-grid" />
      <div className="scriptora-texture-noise" />
    </div>
  );
}
