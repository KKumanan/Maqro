import React, { useState, useEffect } from 'react';
import './AppDropdown.css';

// Import app icons
import figmaIcon from '../assets/images/figma.png';
import discordIcon from '../assets/images/discord.png';
import chromeIcon from '../assets/images/chrome.png';
import steamIcon from '../assets/images/steam.png';
import photoshopIcon from '../assets/images/photoshop.png';

interface AppDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (appPath: string) => void;
  selectedApps: string[];
}

interface App {
  name: string;
  path: string;
  icon: string;
}

const AppDropdown: React.FC<AppDropdownProps> = ({ isOpen, onClose, onSelect, selectedApps }) => {
  const [availableApps, setAvailableApps] = useState<App[]>([
    {
      name: 'Figma',
      path: '/Applications/Figma.app',
      icon: figmaIcon
    },
    {
      name: 'Discord',
      path: '/Applications/Discord.app',
      icon: discordIcon
    },
    {
      name: 'Chrome',
      path: '/Applications/Google Chrome.app',
      icon: chromeIcon
    },
    {
      name: 'Steam',
      path: '/Applications/Steam.app',
      icon: steamIcon
    },
    {
      name: 'Photoshop',
      path: '/Applications/Adobe Photoshop 2024.app',
      icon: photoshopIcon
    }
  ]);

  // Filter out apps that are already in the gallery
  const filteredApps = availableApps.filter(app => !selectedApps.includes(app.path));

  if (!isOpen) return null;

  return (
    <div className="dropdown-container">
      <div className="dropdown-content">
        <div className="dropdown-header">
          <h3>Recently Used</h3>
          <button className="close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="apps-list">
          {filteredApps.map((app, index) => (
            <button
              key={index}
              className="app-item"
              onClick={() => onSelect(app.path)}
            >
              <img src={app.icon} alt={app.name} className="app-icon" />
              <span>{app.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppDropdown; 