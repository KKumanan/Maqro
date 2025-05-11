console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (container) {
    container.textContent = 'Extension is working!';
  }
});
