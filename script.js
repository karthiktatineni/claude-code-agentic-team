// DOM Elements
const buttonContainer = document.getElementById('button-container');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');
const demoForm = document.getElementById('demo-form');
const submitButton = document.getElementById('submit-button');
// State management
let currentTheme = localStorage.getItem('theme') || 'light';
let buttonStates = {};
// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
// Set initial theme
setTheme(currentTheme);

// Render buttons from config
renderButtons();

// Add event listeners
setupEventListeners();

// Apply fade-in animation to buttons
animateButtons();
});
// Render buttons based on configuration
function renderButtons() {
buttonContainer.innerHTML = '';

buttonConfig.forEach(config => {
const button = document.createElement('button');
button.id = config.id;
button.className = `btn btn-${config.variant} fade-in`;
button.textContent = config.label;
button.disabled = config.disabled || false;
button.setAttribute('role', 'button');
button.setAttribute('aria-pressed', config.initialState || false);

if (config.disabled) {
button.setAttribute('aria-disabled', 'true');
}

buttonStates[config.id] = config.initialState || false;

buttonContainer.appendChild(button);
});
}
// Set up event listeners
function setupEventListeners() {
// Button click events
buttonContainer.addEventListener('click', handleButtonClick);

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Form submission
demoForm.addEventListener('submit', handleFormSubmit);

// Add ripple effect on buttons
buttonContainer.addEventListener('mousedown', addRippleEffect);
}
// Handle button clicks
function handleButtonClick(event) {
const button = event.target.closest('button');
if (!button || button.disabled) return;

const buttonId = button.id;

// Toggle selected state
buttonStates[buttonId] = !buttonStates[buttonId];
button.classList.toggle('selected');
button.setAttribute('aria-pressed', buttonStates[buttonId]);
}
// Add ripple effect
function addRippleEffect(event) {
const button = event.target.closest('button');
if (!button || button.disabled) return;

// Respect reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
return;
}

const ripple = document.createElement('span');
const diameter = Math.max(button.clientWidth, button.clientHeight);
const radius = diameter / 2;

ripple.style.width = ripple.style.height = `${diameter}px`;
ripple.style.left = `${event.offsetX - radius}px`;
ripple.style.top = `${event.offsetY - radius}px`;
ripple.classList.add('ripple');

const rippleContainer = button.getElementsByClassName('ripple')[0];
if (rippleContainer) {
rippleContainer.remove();
}

button.appendChild(ripple);
}
// Theme toggle functionality
function toggleTheme() {
currentTheme = currentTheme === 'light' ? 'dark' : 'light';
setTheme(currentTheme);
localStorage.setItem('theme', currentTheme);
}
// Set theme
function setTheme(theme) {
document.documentElement.setAttribute('data-theme', theme);
themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
}
// Animate buttons on load
function animateButtons() {
const buttons = document.querySelectorAll('.btn');
buttons.forEach((button, index) => {
// Respect reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
button.style.animation = 'none';
return;
}

// Staggered animation delay
button.style.animationDelay = `${index * 0.1}s`;
});
}
// Handle form submission
function handleFormSubmit(event) {
event.preventDefault();

const email = document.getElementById('email').value;

// Basic email validation
if (!isValidEmail(email)) {
alert('Please enter a valid email address.');
return;
}

// Show loading state
submitButton.classList.add('loading');
submitButton.disabled = true;

// Simulate API request
setTimeout(() => {
// Reset button state
submitButton.classList.remove('loading');
submitButton.disabled = false;

// Show success feedback
const originalText = submitButton.querySelector('.btn-text').textContent;
submitButton.querySelector('.btn-text').textContent = 'Submitted!';

// Reset text after delay
setTimeout(() => {
submitButton.querySelector('.btn-text').textContent = originalText;
}, 2000);

// Reset form
demoForm.reset();
}, 1500);
}
// Email validation helper
function isValidEmail(email) {
const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return re.test(email);
}