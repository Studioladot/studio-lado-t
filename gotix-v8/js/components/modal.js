import { openModal as open, closeModal as close, openModalDynamic as dynamic } from '../utils/helpers.js';

const modal = { open, close, dynamic };
window.openModal = open;
window.closeModal = close;
window.openModalDynamic = dynamic;
export default modal;
export { open, close, dynamic };
