import React, { useState } from 'react';
import './ApplicationGallery.css';

// Import app logos
import vscodeIcon from '../assets/images/vscode.svg';
import spotifyIcon from '../assets/images/spotify.svg';
import notionIcon from '../assets/images/notion.svg';
import chromeIcon from '../assets/images/chrome.svg';

interface Application {
  id: string;
  name: string;
  icon: string;
  path: string;
}

const ApplicationGallery: React.FC = () => {
  const [applications] = useState<Application[]>([
    { 
      id: '1', 
      name: 'VS Code', 
      icon: vscodeIcon, 
      path: '/Applications/Visual Studio Code.app'
    },
    { 
      id: '2', 
      name: 'Spotify', 
      icon: spotifyIcon, 
      path: '/Applications/Spotify.app'
    },
    { 
      id: '3', 
      name: 'Notion', 
      icon: notionIcon, 
      path: '/Applications/Notion.app'
    },
    { 
      id: '4', 
      name: 'Chrome', 
      icon: chromeIcon, 
      path: '/Applications/Google Chrome.app'
    },
  ]);

  const handleLaunchApp = (path: string) => {
    // This will be implemented later to actually launch the application
    console.log('Launching application at:', path);
  };

  return (
    <div className="gallery-container">
      <div className="gallery-grid">
        {applications.map((app) => (
          <div
            key={app.id}
            className="app-card"
            onClick={() => handleLaunchApp(app.path)}
            title={app.name}
          >
            <img src={app.icon} alt={app.name} className="app-icon" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationGallery; 