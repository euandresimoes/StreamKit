/**
 * Build-time replacement for Nest optional transports and adapter plugins that Streamlet does
 * not use. Nest loads these through guarded require callbacks, but Rollup otherwise converts a
 * missing optional package into an unconditional top-level throw in the Electron main bundle.
 */
export default {}
