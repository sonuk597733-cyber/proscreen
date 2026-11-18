import path from 'path';

const NATIVE_RELATIVE_PATH = path.join(
  'src',
  'native',
  'keyboard-visualizer',
  'build',
  'Release',
  'keyboard_visualizer.node'
);

export function resolveKeyboardVisualizerModulePath(input: {
  isPackaged: boolean;
  resourcesPath: string;
  mainDirectory: string;
}): string {
  if (input.isPackaged) {
    return path.join(input.resourcesPath, 'app.asar.unpacked', NATIVE_RELATIVE_PATH);
  }
  return path.resolve(input.mainDirectory, '..', NATIVE_RELATIVE_PATH);
}
