document.addEventListener('DOMContentLoaded', function() {
  // Fetch the macros from the Node.js server
  fetch('http://localhost:3000/api/macros')
    .then(response => response.json())
    .then(macros => {
      const macroList = document.getElementById('macroList');
      
      // Create a button for each macro
      macros.forEach(macro => {
        const button = document.createElement('button');
        button.className = 'macro-button';
        button.textContent = macro.action;
        
        // Apply custom color if it exists, otherwise use default
        const color = macro.color || '#202124';
        button.style.color = color;
        button.style.borderColor = color;
        
        button.addEventListener('click', () => {
          // Execute the corresponding macro script
          chrome.tabs.query({}, (tabs) => {
            chrome.scripting.executeScript({
              target: {tabId: tabs[tabs.length - 1].id},
              files: ['macro-scripts/' + macro.id + '.js']
            });
          });
        });
        macroList.appendChild(button);
      });
    })
    .catch(error => {
      console.error('Error loading macros:', error);
      const macroList = document.getElementById('macroList');
      macroList.innerHTML = '<p class="error-message">Error loading macros</p>';
    });
}); 