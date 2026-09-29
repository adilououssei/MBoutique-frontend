import { router, type Href } from 'expo-router';

/**
 * Retour arrière sûr : `router.back()` sans écran précédent déclenche
 * « The action 'GO_BACK' was not handled by any navigator » (ex : écran ouvert
 * après un rechargement, ou pile remplacée par une redirection). Dans ce cas
 * on remplace par un écran de repli explicite.
 */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
