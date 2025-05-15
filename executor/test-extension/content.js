// Wait for Gmail to be fully loaded
function waitForElement(selector, callback, maxTries = 60) {
    if (maxTries <= 0) {
        console.log('Element not found:', selector);
        return;
    }
    
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    } else {
        setTimeout(() => {
            waitForElement(selector, callback, maxTries - 1);
        }, 500);
    }
}

// Click the compose button and wait for the compose window
waitForElement('.T-I.T-I-KE', (composeButton) => {
    composeButton.click();
    
    // Wait for compose window and fill in details
    setTimeout(() => {
        // Fill in recipient
        const toField = document.querySelector('input[name="to"]');
        if (toField) {
            toField.value = 'raspberry.pi360@gmail.com';
            toField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill in subject
        const subjectField = document.querySelector('input[name="subjectbox"]');
        if (subjectField) {
            subjectField.value = 'Hello from Chrome Extension';
            subjectField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Fill in body
        const bodyField = document.querySelector('.Am.Al.editable');
        if (bodyField) {
            bodyField.textContent = 'This is an automated email from my Chrome extension!';
            bodyField.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 1000);
});
  