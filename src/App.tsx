import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import ApplicationGallery from './components/ApplicationGallery';
import AppDropdown from './components/AppDropdown';
import './App.css';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddClick = () => {
    setIsDropdownOpen(true);
  };

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleAppSelect = (appPath: string) => {
    setSelectedApps(prev => [...prev, appPath]);
    setIsDropdownOpen(false);
  };

  const handleRemoveApp = (appPath: string) => {
    setSelectedApps(prev => prev.filter(path => path !== appPath));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Maqro</h1>
          <SearchBar onSearch={handleSearch} />
          <button className="add-button" onClick={handleAddClick}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4V20M4 12H20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>
      <main>
        <ApplicationGallery 
          selectedApps={selectedApps} 
          onRemoveApp={handleRemoveApp}
        />
      </main>
      <AppDropdown
        isOpen={isDropdownOpen}
        onClose={handleCloseDropdown}
        onSelect={handleAppSelect}
        selectedApps={selectedApps}
      />
    </div>
  );
};

export default App; 