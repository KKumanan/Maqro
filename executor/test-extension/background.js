// Add a click listener to the extension icon
chrome.action.onClicked.addListener(() => {
  console.log('Extension icon clicked');
  
  // Open Gmail
  chrome.tabs.create({ url: 'https://mail.google.com' }, (gmailTab) => {
    console.log('Gmail tab created:', gmailTab);
    
    // Open Google Docs
    chrome.tabs.create({ url: 'https://docs.google.com' }, (docsTab) => {
      console.log('Docs tab created:', docsTab);
    });
  });
});
  