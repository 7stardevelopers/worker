// Which booking's chat screen is open right now. Used to hide the push banner
// for a new message the user is already looking at.
let activeChatBookingId = null;

export const setActiveChat = (bookingId) => { activeChatBookingId = bookingId ? String(bookingId) : null; };
export const clearActiveChat = (bookingId) => {
  if (!bookingId || activeChatBookingId === String(bookingId)) activeChatBookingId = null;
};
export const isViewingChat = (bookingId) => !!bookingId && activeChatBookingId === String(bookingId);
