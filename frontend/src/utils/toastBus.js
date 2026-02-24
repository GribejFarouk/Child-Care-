export const APP_TOAST_EVENT = 'app:toast';

export function showNotImplementedToast(message = 'Not Implemented') {
  window.dispatchEvent(
    new CustomEvent(APP_TOAST_EVENT, {
      detail: { message },
    })
  );
}
