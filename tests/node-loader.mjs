// Node用ローダー: 'three/addons/*' をローカルの assets/three/* に解決する
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('three/addons/')) {
    const path = specifier.replace('three/addons/', '');
    return next(new URL('../assets/three/' + path, import.meta.url).href, context);
  }
  return next(specifier, context);
}
