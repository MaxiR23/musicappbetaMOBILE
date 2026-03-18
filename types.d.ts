declare module 'react-native-canvas';

// types.d.ts
declare module 'expo-router/entry' {
  const Entry: any;
  export default Entry;
}

// SEE: https://reactnative.dev/docs/images#static-image-resources
// RN resuelve assets estáticos como números (IDs internos del Metro bundler).
// Sin esta declaración, TypeScript no sabe qué tipo devuelve un import de .png.
declare module "*.png" {
  const value: number;
  export default value;
}