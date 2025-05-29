document.addEventListener('DOMContentLoaded', function() {
  // Fetch the macros from the JSON file
  fetch(chrome.runtime.getURL('saved-macro-list.json'))
    .then(response => response.json())
    .then(data => {
      const macroList = document.getElementById('macroList');
      
      // Create a button for each macro
      data.macros.forEach(macro => {
        const button = document.createElement('button');
        button.className = 'macro-button';
        button.textContent = macro.action;
        button.addEventListener('click', () => {
          // Here you can add the logic to execute the macro
          console.log(`Executing macro: ${macro.id}`);
          // chrome.tabs.create({
          //   url: "https://www.google.com", // URL for the new tab
          //   active: false // Keep focus on the current tab
          // });
          
          // Execute the corresponding macro script
          chrome.tabs.query({}, (tabs) => {
            console.log(tabs[tabs.length - 1].url);
            chrome.scripting.executeScript({
                  target: {tabId: tabs[tabs.length - 2].id},
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
      macroList.innerHTML = '<p style="color: red;">Error loading macros</p>';
    });
}); 