import React, { useState, useEffect } from 'react';
import './ApplicationGallery.css';
import AppPopup from './AppPopup';

// Import app logos
import vscodeIcon from '../assets/images/vscode.png';
import spotifyIcon from '../assets/images/spotify.png';
import notionIcon from '../assets/images/notion.png';
import slackIcon from '../assets/images/slack.png';
import figmaIcon from '../assets/images/figma.png';
import discordIcon from '../assets/images/discord.png';
import chromeIcon from '../assets/images/chrome.png';
import steamIcon from '../assets/images/steam.png';
import photoshopIcon from '../assets/images/photoshop.png';

interface Application {
  id: string;
  name: string;
  icon: string;
  path: string;
}

const getAppIcon = (appPath: string): string => {
  const appName = appPath.toLowerCase();
  
  if (appName.includes('google chrome')) return chromeIcon;
  if (appName.includes('photoshop')) return photoshopIcon;
  if (appName.includes('figma')) return figmaIcon;
  if (appName.includes('discord')) return discordIcon;
  if (appName.includes('steam')) return steamIcon;
  if (appName.includes('vscode') || appName.includes('visual studio code')) return vscodeIcon;
  if (appName.includes('spotify')) return spotifyIcon;
  if (appName.includes('notion')) return notionIcon;
  if (appName.includes('slack')) return slackIcon;
  
  return '';
};

interface ApplicationGalleryProps {
  selectedApps: string[];
}

const ApplicationGallery: React.FC<ApplicationGalleryProps> = ({ selectedApps }) => {
  const [applications, setApplications] = useState<Application[]>([
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
      name: 'Slack', 
      icon: slackIcon, 
      path: '/Applications/Slack.app'
    },
  ]);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    // Add new selected apps to the gallery
    selectedApps.forEach(appPath => {
      if (!applications.some(app => app.path === appPath)) {
        const appName = appPath.split('/').pop()?.replace('.app', '') || '';
        const icon = getAppIcon(appPath);
        
        if (icon) {
          const newApp: Application = {
            id: Date.now().toString(),
            name: appName,
            icon: icon,
            path: appPath
          };
          
          setApplications(prev => [...prev, newApp]);
        }
      }
    });
  }, [selectedApps]);

  const handleAppClick = (app: Application) => {
    setSelectedApp(app);
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedApp(null);
  };

  return (
    <>
      <div className="gallery-container">
        <div className="gallery-grid">
          {applications.map((app) => (
            <div
              key={app.id}
              className="app-card"
              onClick={() => handleAppClick(app)}
              title={app.name}
            >
              <img src={app.icon} alt={app.name} className="app-icon" />
            </div>
          ))}
        </div>
      </div>
      
      {selectedApp && (
        <AppPopup
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
          app={selectedApp}
        />
      )}
    </>
  );
};

export default ApplicationGallery; 