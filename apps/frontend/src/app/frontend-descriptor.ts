export type FrontendDescriptor = {
  framework: 'vue'
  state: 'pinia'
  styles: 'scss'
}

export function createFrontendDescriptor(): FrontendDescriptor {
  return {
    framework: 'vue',
    state: 'pinia',
    styles: 'scss',
  }
}
