import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import ApplicationGallery from './components/ApplicationGallery';
import './App.css';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddClick = () => {
    // This will be implemented later to add new applications
    console.log('Add button clicked');
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
        <ApplicationGallery />
      </main>
    </div>
  );
};

export default App; 