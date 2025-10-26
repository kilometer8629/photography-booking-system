/*
 * scripts.js
 *
 * Adds interactivity to the Santa experience pages. Handles responsive
 * navigation toggling and simple form submission feedback for booking forms.
 */

// Wait for the DOM to load before attaching listeners
document.addEventListener('DOMContentLoaded', () => {
    // Toggle mobile navigation
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
    });

    // Close the mobile menu when a link is clicked (use event delegation)
    navMenu.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            navMenu.classList.remove('open');
        }
    });
});

/**
 * Handles booking form submissions by displaying a confirmation message and
 * preventing the default form submission. The function can be reused by
 * multiple forms across different pages.
 *
 * @param {Event} event
 * @returns {boolean}
 */
function handleBooking(event) {
    event.preventDefault();
    const form = event.target;
    const message = form.nextElementSibling;
    // Show confirmation message
    if (message) {
        message.classList.remove('hidden');
        // Optionally hide the message after a delay
        setTimeout(() => {
            message.classList.add('hidden');
        }, 5000);
    }
    // Reset the form for demonstration purposes
    form.reset();
    return false;
}